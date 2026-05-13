import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { generateAgentResponse } from "../services/llm";
import { logToDaily } from "../services/memory";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Agent name mapping
const agentNames = ["tigerclaw", "tesla", "torvalds", "curie", "porter", "ogilvy", "kotler", "ive", "carnegie", "dewey"];
function parseAgentMention(text: string): { agent: string | null; task: string } {
    const mentionMatch = text.match(/^@?(\w+)\s+(.+)/i);
    if (mentionMatch) {
        const potentialAgent = mentionMatch[1].toLowerCase();
        if (agentNames.includes(potentialAgent)) {
            return { agent: potentialAgent, task: mentionMatch[2] };
        }
    }
    return { agent: null, task: text };
}

// Get agent info from database
async function getAgentByName(name: string) {
    const agents = await client.query(api.agents.list);
    return agents.find(a => a.name.toLowerCase() === name.toLowerCase());
}

type TelegramLockState = {
    lockPath: string;
    release: () => void;
};

function pidExists(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function findActiveClawdbotGatewayLock(): { pid: number; configPath?: string } | null {
    const tmpDir = os.tmpdir();
    let entries: string[] = [];
    try {
        entries = fs.readdirSync(tmpDir);
    } catch {
        return null;
    }

    for (const entry of entries) {
        if (!entry.startsWith("clawdbot-")) continue;
        const dirPath = path.join(tmpDir, entry);
        let files: string[] = [];
        try {
            files = fs.readdirSync(dirPath);
        } catch {
            continue;
        }

        for (const fileName of files) {
            if (!/^gateway\..+\.lock$/.test(fileName)) continue;
            try {
                const raw = fs.readFileSync(path.join(dirPath, fileName), "utf-8");
                const parsed = JSON.parse(raw) as { pid?: number; configPath?: string };
                if (parsed.pid && parsed.pid !== process.pid && pidExists(parsed.pid)) {
                    return { pid: parsed.pid, configPath: parsed.configPath };
                }
            } catch {
                continue;
            }
        }
    }

    return null;
}

function acquireTelegramLock(token: string): TelegramLockState | null {
    const lockDir = path.join(os.tmpdir(), `mission-control-${process.getuid?.() ?? process.pid}`);
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex").slice(0, 12);
    const lockPath = path.join(lockDir, `telegram.${tokenHash}.lock`);

    fs.mkdirSync(lockDir, { recursive: true });

    try {
        const existing = fs.readFileSync(lockPath, "utf-8");
        const parsed = JSON.parse(existing) as { pid?: number };
        if (parsed.pid && parsed.pid !== process.pid && pidExists(parsed.pid)) {
            console.warn(`[TELEGRAM] Another mission-control Telegram poller is already active (pid ${parsed.pid}).`);
            return null;
        }
        fs.rmSync(lockPath, { force: true });
    } catch {
        // No lock or unreadable stale lock.
    }

    fs.writeFileSync(lockPath, JSON.stringify({
        pid: process.pid,
        createdAt: new Date().toISOString(),
        cwd: process.cwd(),
    }), { flag: "w" });

    let released = false;
    const release = () => {
        if (released) return;
        released = true;
        try {
            fs.rmSync(lockPath, { force: true });
        } catch {
            // Ignore cleanup failures.
        }
    };

    process.once("exit", release);
    process.once("SIGINT", release);
    process.once("SIGTERM", release);

    return { lockPath, release };
}

export function startTelegramBot() {
    if (!TELEGRAM_TOKEN) {
        console.error("[TELEGRAM] No bot token found! Set TELEGRAM_BOT_TOKEN in .env.local");
        return;
    }

    const competingGateway = findActiveClawdbotGatewayLock();
    if (competingGateway) {
        console.warn(
            `[TELEGRAM] Active clawdbot-gateway detected (pid ${competingGateway.pid}${competingGateway.configPath ? `, config ${competingGateway.configPath}` : ""}). ` +
            "Skipping Mission Control Telegram polling to avoid Telegram 409 conflicts.",
        );
        return;
    }

    const lock = acquireTelegramLock(TELEGRAM_TOKEN);
    if (!lock) return;

    const bot = new TelegramBot(TELEGRAM_TOKEN, {
        polling: {
            autoStart: true,
            interval: 300,
            params: { timeout: 10 },
        },
    });
    console.log(`[TELEGRAM] Bot started! Listening for messages... (lock: ${lock.lockPath})`);

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text) return;

        // Parse the message for agent mentions
        const { agent: requestedAgent, task } = parseAgentMention(text);

        try {
            // If specific agent requested
            if (requestedAgent) {
                const agent = await getAgentByName(requestedAgent);
                if (!agent) {
                    await bot.sendMessage(chatId, `❌ Agent "${requestedAgent}" not found.`);
                    return;
                }

                await bot.sendMessage(chatId, `🤖 ${agent.name} is working on your request...`);

                // Generate response
                const response = await generateAgentResponse(agent.name, agent.role ?? agent.name, task);

                // Log to memory
                logToDaily(agent.name, "Telegram Task", `Received from Telegram: "${task}"`);

                // Send response (split if too long)
                if (response.length > 4000) {
                    const chunks = response.match(/.{1,4000}/g) || [];
                    for (const chunk of chunks) {
                        await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
                    }
                } else {
                    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                }

                // Log activity
                await client.mutation(api.agents.logActivity, {
                    agentName: agent.name,
                    type: "telegram",
                    content: `Responded to Telegram: "${task.substring(0, 50)}..."`,
                });

            } else {
                // No specific agent - route to Tigerclaw (Squad Lead)
                const tigerclaw = await getAgentByName("tigerclaw");
                if (!tigerclaw) {
                    await bot.sendMessage(chatId, "❌ Squad not initialized. Start the Gateway first.");
                    return;
                }

                await bot.sendMessage(chatId, "🎯 Tigerclaw is reviewing your request...");

                const response = await generateAgentResponse("Tigerclaw", "Squad Lead", task);

                logToDaily("Tigerclaw", "Telegram Task", `Received from Telegram: "${task}"`);

                if (response.length > 4000) {
                    const chunks = response.match(/.{1,4000}/g) || [];
                    for (const chunk of chunks) {
                        await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
                    }
                } else {
                    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                }

                await client.mutation(api.agents.logActivity, {
                    agentName: "Tigerclaw",
                    type: "telegram",
                    content: `Responded to Telegram: "${task.substring(0, 50)}..."`,
                });
            }
        } catch (error) {
            console.error("[TELEGRAM] Error processing message:", error);
            await bot.sendMessage(chatId, "❌ An error occurred. Check the Gateway logs.");
        }
    });

    bot.on('polling_error', async (error) => {
        console.error("[TELEGRAM] Polling error:", error);
        if (String(error).includes("409 Conflict")) {
            console.warn("[TELEGRAM] Stopping polling after Telegram 409 conflict.");
            try {
                await bot.stopPolling();
            } catch {
                // Ignore shutdown errors.
            } finally {
                lock.release();
            }
        }
    });

    return bot;
}
