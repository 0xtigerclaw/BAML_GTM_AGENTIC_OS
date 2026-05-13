import * as fs from 'fs';
import * as path from 'path';
import { generateImage, createDesignPrompt } from './imageGen';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { extractLinkedInOverlayText, generateLinkedInOverlayImage } from "./linkedinOverlay";
import { BAML_GTM_TASK_MARKER, getBamlGtmAgentHarness } from "../lib/bamlGtmDemo";

// Load agent SOUL file
function loadSoul(agentName: string): string {
    const soulPath = path.join(process.cwd(), 'squad', `${agentName.toLowerCase()}.md`);
    try {
        return fs.readFileSync(soulPath, 'utf-8');
    } catch {
        console.warn(`[SOUL] Could not load SOUL for ${agentName}: ${soulPath}`);
        return `Role: ${agentName}`;
    }
}

function loadBamlGtmSkill(agentName: string): string {
    const skillPath = path.join(process.cwd(), 'squad', 'baml-gtm', `${agentName.toLowerCase()}.md`);
    try {
        return fs.readFileSync(skillPath, 'utf-8');
    } catch {
        return "";
    }
}

function isBamlGtmMission(task: string): boolean {
    return task.includes(BAML_GTM_TASK_MARKER) || task.includes("BAML Opportunity Radar") || task.includes("BAML Developer Opportunity");
}

function extractPromptSection(markdown: string, heading: string): string {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = markdown.match(new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`, "i"));
    return match?.[1]?.trim() || "";
}

function buildDeterministicBamlDemoResponse(agentName: string, task: string, previousOutput: string): string {
    const discussion = extractPromptSection(task, "Developer Discussion") || "Developer discussion not provided.";
    const pain = extractPromptSection(task, "Detected Pain") || "Structured-output reliability pain.";
    const relevance = extractPromptSection(task, "Why BAML Might Be Relevant") || "BAML may help with typed LLM functions, structured outputs, testing, and provider flexibility.";
    const angle = extractPromptSection(task, "Suggested GTM Angle") || "Lead with a useful technical distinction, then mention BAML as one implementation path.";

    if (agentName === "Porter") {
        return [
            "## Conversation Summary",
            discussion,
            "",
            "## Developer Pain",
            pain,
            "",
            "## Why BAML Is Relevant",
            relevance,
            "",
            "## Scorecard",
            "| Dimension | Score | Rationale |",
            "| --- | ---: | --- |",
            "| BAML relevance | 92/100 | The pain maps directly to typed, testable structured-output workflows. |",
            "| ICP fit | 88/100 | The speaker sounds like an AI engineer or product engineer shipping LLM features. |",
            "| Channel fit | 82/100 | Public technical reply works if it is useful and caveated. |",
            "| Policy risk | 24/100 | Low if the human posts once, avoids hype, and does not mass-reply. |",
            "",
            "## Recommended Angle",
            angle,
            "",
            "## Recommendation",
            "`publish` after technical proof and credibility QA.",
            "",
            "## Agent Notes",
            "Keep the response practical. Do not lead with a product pitch.",
        ].join("\n");
    }

    if (agentName === "Torvalds") {
        return [
            "## Current Workflow Pain",
            pain,
            "",
            "The fragile version usually looks like prompt text, hand-written schema instructions, parser retries, and application types drifting across separate files.",
            "",
            "## Before: brittle structured output",
            "```ts",
            "const prompt = `Extract the fields as JSON. Make sure it is valid.`;",
            "const raw = await model.generate(prompt);",
            "const parsed = JSON.parse(raw.text);",
            "const ticket = TicketSchema.parse(parsed); // fails late if prompt/schema/types drift",
            "```",
            "",
            "## After: BAML-style typed LLM function",
            "```baml",
            "class TicketSummary {",
            "  category string",
            "  priority string",
            "  next_action string",
            "}",
            "",
            "function SummarizeTicket(ticket: string) -> TicketSummary {",
            "  client \"openai/gpt-4o-mini\"",
            "  prompt #\"",
            "    Summarize this support ticket.",
            "    {{ ticket }}",
            "    {{ ctx.output_format }}",
            "  \"#",
            "}",
            "```",
            "",
            "## Why This Helps",
            "- The LLM call is named like a function.",
            "- The input and return shape are explicit.",
            "- The output contract can be previewed, tested, and shared across generated clients.",
            "- The human reply can recommend BAML without claiming it magically eliminates all model errors.",
            "",
            "## Recommended Resource",
            "Point the developer to BAML docs or examples for typed LLM functions and structured outputs.",
            "",
            "## Caveat",
            "This is a demo proof artifact, not a live BAML execution.",
        ].join("\n");
    }

    if (agentName === "Ogilvy") {
        return normalizeStrictJsonFence(JSON.stringify({
            drafts: [
                {
                    title: "X Reply",
                    content: [
                        "This is the point where JSON mode stops being the whole solution.",
                        "",
                        "The harder problem is keeping prompt instructions, output shape, parser behavior, and app types in sync as the workflow changes.",
                        "",
                        "One useful pattern is to define the LLM call as a typed function, then test examples against that contract. BAML is worth a look for that exact workflow.",
                    ].join("\n"),
                    agent: "Ogilvy",
                },
                {
                    title: "HN / Reddit Comment",
                    content: [
                        "I would separate two problems here:",
                        "",
                        "1. Can the model usually emit JSON?",
                        "2. Can the team maintain and test that contract as production code?",
                        "",
                        "A lot of pain comes from the second one. The prompt says one thing, the parser expects another, and the application type drifts later.",
                        "",
                        "BAML is interesting because it treats the LLM call like a typed function: inputs, return type, prompt, output format, and generated client live around the same contract. That does not remove all model risk, but it makes the workflow much easier to reason about and test.",
                    ].join("\n"),
                    agent: "Ogilvy",
                },
                {
                    title: "DevRel DM",
                    content: [
                        "Saw your thread on structured-output reliability. The thing you described is exactly where teams start needing more than JSON mode: typed contracts, prompt tests, and a single source of truth for schema + client behavior.",
                        "",
                        "BAML may be worth evaluating if you want a lightweight layer for typed LLM functions rather than a full orchestration framework.",
                    ].join("\n"),
                    agent: "Ogilvy",
                },
                {
                    title: "Resource CTA",
                    content: "Soft CTA: `If useful, look at BAML's typed LLM function examples. The framing is closer to treating prompts as software interfaces than as free-form strings.`",
                    agent: "Ogilvy",
                },
            ],
        }, null, 2));
    }

    if (agentName === "Carnegie") {
        return normalizeStrictJsonFence(JSON.stringify({
            integrity_checks: [
                {
                    rule: "Relevance",
                    status: "pass",
                    notes: "The response addresses the stated structured-output pain before mentioning BAML.",
                },
                {
                    rule: "Developer-native tone",
                    status: "pass",
                    notes: "The draft avoids hype and explains a concrete engineering distinction.",
                },
                {
                    rule: "Policy / spam risk",
                    status: "warning",
                    notes: "Safe as a single human-approved reply; not suitable for automated bulk replies.",
                },
                {
                    rule: "Factual discipline",
                    status: "pass",
                    notes: "No benchmarks, production claims, or live scraping claims are included.",
                },
            ],
            edit_notes: "Use the HN/Reddit style response for technical communities. Use the shorter X reply only when the original post is directly asking about structured-output reliability.",
            final_polish: [
                "Recommended action: publish manually only if the human reviewer confirms the thread is asking for help with structured outputs, prompt tests, schema drift, or provider flexibility.",
                "",
                "Best final response:",
                "",
                "I would separate two problems here:",
                "",
                "1. Can the model usually emit JSON?",
                "2. Can the team maintain and test that contract as production code?",
                "",
                "A lot of pain comes from the second one. The prompt says one thing, the parser expects another, and the application type drifts later.",
                "",
                "BAML is interesting because it treats the LLM call like a typed function: inputs, return type, prompt, output format, and generated client live around the same contract. That does not remove all model risk, but it makes the workflow much easier to reason about and test.",
            ].join("\n"),
            finalized_drafts: [
                {
                    draft_id: "recommended_response",
                    final_post_text: "I would separate two problems here:\n\n1. Can the model usually emit JSON?\n2. Can the team maintain and test that contract as production code?\n\nA lot of pain comes from the second one. The prompt says one thing, the parser expects another, and the application type drifts later.\n\nBAML is interesting because it treats the LLM call like a typed function: inputs, return type, prompt, output format, and generated client live around the same contract. That does not remove all model risk, but it makes the workflow much easier to reason about and test.",
                    cta_question: "Would a typed LLM-function workflow fit your stack, or is the bigger issue runtime validation?",
                    proof_point_used: "Typed LLM function contract keeps prompt, output shape, and generated client aligned.",
                    quotable_line: "JSON mode is an output feature; reliability is a workflow problem.",
                },
            ],
        }, null, 2));
    }

    if (agentName === "Tigerclaw") {
        return [
            "## Final Score",
            "Opportunity quality: 88/100",
            "",
            "## Recommendation",
            "`publish` manually after human review. Do not automate posting.",
            "",
            "## Strongest Artifact",
            "The technical proof clarifies that BAML's wedge is not just JSON validity; it is maintaining typed, testable LLM function contracts.",
            "",
            "## Highest Risk",
            "A reply can feel promotional if it appears in a thread that is not explicitly asking about structured-output reliability.",
            "",
            "## What Worked",
            "- The workflow starts from an actual developer pain.",
            "- Porter scores fit before copy is written.",
            "- Torvalds creates a technical proof before Ogilvy drafts copy.",
            "- Carnegie blocks hype and flags policy risk.",
            "",
            "## What Breaks",
            "- Demo mode uses curated inputs, not live platform APIs.",
            "- Engagement outcomes require manual feedback after publishing.",
            "",
            "## Improve With More Time",
            "- Add official read-only API connectors.",
            "- Add duplicate/opportunity suppression.",
            "- Train scoring on actual post-outcome feedback.",
        ].join("\n");
    }

    return [
        "## BAML Demo Response",
        "This deterministic demo response was generated because no live LLM key is configured.",
        "",
        previousOutput || task,
    ].join("\n");
}

import { spawn } from 'child_process';

function extractFirstFencedJson(text: string): string | null {
    const match = text.match(/```json\s*\n([\s\S]*?)\n```/i);
    return match ? match[1] : null;
}

function normalizeStrictJsonFence(jsonStr: string): string {
    return `\`\`\`json\n${jsonStr.trim()}\n\`\`\``;
}

function tryParseJson(jsonStr: string): { ok: true } | { ok: false; message: string } {
    try {
        JSON.parse(jsonStr);
        return { ok: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message };
    }
}

function requestedLlmProvider(): "auto" | "openai" | "gemini" | "clawdbot" {
    const provider = (process.env.LLM_PROVIDER || "auto").toLowerCase();
    if (provider === "chatgpt" || provider === "clawdbot") return "clawdbot";
    if (provider === "openai" || provider === "gemini") return provider;
    return "auto";
}

function extractOpenAIText(response: { output_text?: string; output?: unknown }): string {
    if (typeof response.output_text === "string" && response.output_text.trim()) {
        return response.output_text;
    }

    const output = Array.isArray(response.output) ? response.output : [];
    const parts: string[] = [];
    for (const item of output) {
        if (!item || typeof item !== "object") continue;
        const content = (item as { content?: unknown }).content;
        if (!Array.isArray(content)) continue;
        for (const part of content) {
            if (!part || typeof part !== "object") continue;
            const text = (part as { text?: unknown }).text;
            if (typeof text === "string") parts.push(text);
        }
    }
    return parts.join("\n").trim();
}

async function runOpenAIResponse(promptText: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
        model,
        input: promptText,
    });

    const text = extractOpenAIText(response);
    if (!text) throw new Error("OpenAI response did not include output text");
    return text;
}

async function runGeminiResponse(promptText: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(promptText);
    return result.response.text();
}

async function ensureValidStrictJsonOutput(
    agentName: string,
    rawText: string,
    runRepair: (repairPrompt: string) => Promise<string>,
): Promise<string> {
    const fenced = extractFirstFencedJson(rawText);
    const candidate = fenced ?? rawText;
    const firstPass = tryParseJson(candidate);
    if (firstPass.ok) return fenced ? normalizeStrictJsonFence(candidate) : rawText.trim();

    console.warn(`[STRICT JSON] ${agentName} produced invalid JSON. Attempting auto-repair. Parse error: ${firstPass.message}`);

    const repairPrompt = `Your previous output was NOT valid JSON and could not be parsed.

Fix it and return EXACTLY ONE fenced JSON block:
- Start with \`\`\`json
- End with \`\`\`
- The JSON inside must be strictly valid (no trailing commas, no comments).
- Do not add any prose or markdown outside the JSON fence.
- Preserve the same schema and meaning; only fix formatting/validity.

INVALID OUTPUT (fix this):
${rawText}`;

    const repaired = await runRepair(repairPrompt);
    const repairedFenced = extractFirstFencedJson(repaired);
    const repairedCandidate = repairedFenced ?? repaired;
    const repairedPass = tryParseJson(repairedCandidate);
    if (repairedPass.ok) return repairedFenced ? normalizeStrictJsonFence(repairedCandidate) : repaired.trim();

    console.warn(`[STRICT JSON] ${agentName} auto-repair failed. Keeping original output. Parse error: ${repairedPass.message}`);
    return rawText.trim();
}

async function runClawdbot(
    agentName: string,
    prompt: string,
    imageResult: { localPath: string } | null,
    sessionScope: string = "",
): Promise<string> {
    console.log(`[LLM] Delegating to Clawdbot CLI for ${agentName}...`);
    const safeScope = (sessionScope || "default")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .slice(0, 64);
    const sessionId = `mission-control-${agentName.toLowerCase()}-${safeScope}`;

    // Use spawn instead of exec to avoid shell injection
    return new Promise((resolve, reject) => {
        const binPath = './node_modules/.bin/clawdbot';

        // Ensure arguments are passed as an array to bypass shell interpretation
        const args = [
            'agent',
            '--session-id', sessionId,
            '--message', prompt,
            '--json'
        ];

        console.log(`[LLM] DEBUG: KEY CHECK - BRAVE_API_KEY=${process.env.BRAVE_API_KEY ? "EXISTS" : "MISSING"}`);

        const child = spawn(binPath, args, {
            env: {
                ...process.env,
                PATH: (process.env.PATH || '') + ':/usr/local/bin',
                // Clawdbot CLI requires BRAVE_SEARCH_API_KEY, but we use BRAVE_API_KEY in .env
                BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY
            },
            stdio: ['ignore', 'pipe', 'pipe'] // Explicitly ignore stdin to prevent background suspension
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('error', (err) => {
            reject(new Error(`Spawn error: ${err.message}`));
        });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`[LLM] Clawdbot exited with code ${code}`);
                console.error(`[LLM] Stderr: ${stderr}`);
                // Try to parse error from JSON if possible, otherwise use stderr
                reject(new Error(`Clawdbot failed (code ${code}): ${stderr}`));
                return;
            }

            try {
                // Find JSON in output (sometimes there are logs before/after)
                const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    reject(new Error(`No JSON found in output: ${stdout.substring(0, 200)}...`));
                    return;
                }

                const response = JSON.parse(jsonMatch[0]);

                if (response.status === 'ok' && response.result?.payloads?.[0]?.text) {
                    let text = response.result.payloads[0].text;

                    // Append generated image if any
                    if (imageResult && agentName.toLowerCase() === "ive") {
                        text += `\n\n---\n\n### 🎨 Generated Visual\n\n![Design Mockup](${imageResult.localPath})\n\n*Visual mockup created by Ive*`;
                    }
                    resolve(text.trim());
                } else {
                    reject(new Error("Invalid JSON structure from Clawdbot"));
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                reject(new Error(`Failed to parse Clawdbot output: ${message}`));
            }
        });
    });
}

export async function generateAgentResponse(
    agentName: string,
    role: string,
    task: string,
    previousOutput: string = "",
    relevantContext: string = "", // RAG Context
    onActivity?: (type: string, content: string) => void,
    sessionScope: string = "",
): Promise<string> {
    console.log(`[LLM] ${agentName} (${role}) thinking about: "${task}"...`);
    if (onActivity) onActivity("log", `Thinking about: "${task.substring(0, 50)}..."`);

    const bamlMission = isBamlGtmMission(task);
    const bamlSkill = bamlMission ? loadBamlGtmSkill(agentName) : "";
    const bamlHarness = bamlMission ? getBamlGtmAgentHarness(agentName) : "";
    const soul = [
        loadSoul(agentName),
        bamlSkill ? `\n---\n\n## Dedicated BAML GTM Skill File\n\n${bamlSkill}` : "",
        bamlHarness ? `\n---\n\n${bamlHarness}` : "",
    ].filter(Boolean).join("\n\n");
    console.log(`[SOUL] Loaded personality for ${agentName} (${soul.length} chars)`);

    // Special handling for Ive (Designer) - generate images
    let imageResult: { url: string; localPath: string } | null = null;
    if (agentName.toLowerCase() === "ive") {
        console.log(`[LLM] Ive detected - will generate LinkedIn visual...`);

        // Prefer deterministic overlays on a reference template (better brand consistency).
        const defaultTemplatePath = path.resolve(__dirname, "..", "public", "templates", "linkedin_base.png");
        const templatePath = process.env.LINKEDIN_TEMPLATE_PATH || defaultTemplatePath;
        const selectedMatch = `${task}\n\n${previousOutput}`.match(/SELECTED_OVERLAY_HOOK:\s*(.+)$/im);
        const selected = (selectedMatch?.[1] || "").trim();
        const overlayText = selected
            ? selected
            : extractLinkedInOverlayText(task, previousOutput);

        imageResult = await generateLinkedInOverlayImage({
            templatePath,
            overlayText,
            agentName,
        });

        if (imageResult) {
            console.log(`[LLM] Ive overlay image created using template: ${templatePath}`);
            console.log(`[LLM] Ive overlay text: "${overlayText}"`);
        } else {
            console.warn(
                `[LLM] Ive overlay image not created (template missing/unreadable or no overlay text). ` +
                `Template attempted: ${templatePath}. Overlay text: "${overlayText}".`,
            );
            // Only allow generative fallback if explicitly enabled.
            const allowFallback = (process.env.IVE_ALLOW_GENERATIVE_FALLBACK || "").toLowerCase() === "true";
            if (allowFallback) {
                const designPrompt = createDesignPrompt(task);
                imageResult = await generateImage(designPrompt, agentName);
            }
        }
    }

    const strictJsonOutput = ["Curie", "Ogilvy", "Carnegie"].includes(agentName);

    // Build the prompt with Task at the TOP for maximum attention
    const prompt = `## CURRENT MISSION (TASK)
You have been assigned the following task. Execute it precisely.

**TASK:** ${task}

---

## Your Identity: ${agentName}, a ${role}

${soul}

---

## 🧠 Relevant Past Experience (Long-Term Memory)
${(relevantContext && !(agentName === "Porter" && task.includes("Company Knowledge Context")))
            ? "You have successfully completed similar missions in the past. Use these insights to guide your current work:\n\n" + relevantContext
            : "(No relevant past memories found or redundant with current context)"}

---

## Context from Previous Agents
The following work has already been done on this mission. READ IT CAREFULLY.
Your job is to BUILD UPON this work, not replace it.

${previousOutput ? previousOutput : "(No previous work)"}

---

**CRITICAL OUTPUT INSTRUCTIONS:**
- If the task asks you to WRITE something (blog, article, email, copy), your output should BE that thing. Output the actual blog/article/email itself, properly formatted.
- If the task asks you to CODE something, output the actual code with explanations.
- If the task asks you to RESEARCH or ANALYZE, output a proper research report.
- Do NOT write "Mission Report" about doing the task. Actually DO the task and output the result.
${strictJsonOutput
            ? `- Output must be machine-readable only.
- Return exactly one fenced JSON block and no extra prose before or after it.
- Do not include sign-offs, "Agent Notes", provider labels, or markdown outside the JSON fence.`
            : `Format your output in clean, professional Markdown.
At the very end, add a brief "Agent Notes" section (2-3 lines max) with any recommendations.`}

**Output the actual deliverable below:**
`;

    try {
        const provider = requestedLlmProvider();
        const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
        const hasGemini = Boolean(process.env.GEMINI_API_KEY);
        const hasClawdbot = fs.existsSync(path.join(process.cwd(), "node_modules", ".bin", "clawdbot"));
        const useOpenAI = provider === "openai" || (provider === "auto" && hasOpenAI);
        const useGemini = !useOpenAI && (provider === "gemini" || (provider === "auto" && hasGemini));
        const useClawdbot = !useOpenAI && !useGemini && (provider === "clawdbot" || (provider === "auto" && hasClawdbot));

        if (!useOpenAI && !useGemini && !useClawdbot) {
            if (bamlMission) {
                console.warn(`[LLM] No LLM API key configured. Using deterministic BAML demo response for ${agentName}.`);
                if (onActivity) onActivity("log", `Using deterministic BAML demo response.`);
                return buildDeterministicBamlDemoResponse(agentName, task, previousOutput);
            }
            throw new Error("No LLM provider configured. Set LLM_PROVIDER=clawdbot for ChatGPT auth, or set OPENAI_API_KEY/GEMINI_API_KEY.");
        }

        const providerLabel = useOpenAI
            ? `OpenAI: ${process.env.OPENAI_MODEL || "gpt-4o-mini"}`
            : useGemini
                ? `Gemini: ${process.env.GEMINI_MODEL || "gemini-2.5-flash"}`
                : "ChatGPT Auth via Clawdbot";

        console.log(`[LLM] Calling ${providerLabel} for ${agentName}...`);
        if (onActivity) onActivity("action", `Calling ${providerLabel}...`);

        const executeModel = async (promptText: string) => {
            if (useOpenAI) return await runOpenAIResponse(promptText);
            if (useGemini) return await runGeminiResponse(promptText);
            return await runClawdbot(agentName, promptText, null, sessionScope);
        };

        let text = await executeModel(prompt);

        if (imageResult && agentName.toLowerCase() === "ive") {
            text += `\n\n---\n\n### 🎨 Generated Visual\n\n![Design Mockup](${imageResult.localPath})\n\n*Visual mockup created by Ive*`;
        }

        if (strictJsonOutput) {
            return await ensureValidStrictJsonOutput(agentName, text, async (repairPrompt) => {
                return await executeModel(repairPrompt);
            });
        }

        if (bamlMission) {
            return text.trim();
        }

        return text + `\n\n*(via ${providerLabel})*`;

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[LLM] Generation failed:", message);

        // Even on error, if Ive has an image, return it
        if (imageResult && agentName.toLowerCase() === "ive") {
            return `## Mission Report: Design Mockup\n\n**Agent:** Ive\n**Status:** PARTIAL SUCCESS\n\n### Visual Mockup\n\n![Design Mockup](${imageResult.localPath})\n\n*Visual created by Ive (text generation failed)*\n\n---\n\n*(Image generated successfully, text generation failed)*`;
        }

        return `## ❌ Mission Failed\n**Agent:** ${agentName}\n**Status:** FAILED\n\n> LLM Gateway error.\n\n### Error\n\`\`\`\n${message}\n\`\`\`\n\n*System Alert*`;
    }
}
