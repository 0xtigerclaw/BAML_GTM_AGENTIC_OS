import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as dotenv from "dotenv";
import {
    buildXAuthProfileLockPaths,
    getXAuthBootstrapBrowserConfig,
    isXAuthProfileLocked,
} from "../services/xThreadExtractor";

dotenv.config({ path: ".env.local" });

async function waitForProfileUnlock(profileDir: string, timeoutMs = 30_000): Promise<void> {
    const startedAt = Date.now();
    const lockPaths = buildXAuthProfileLockPaths(profileDir);

    while (Date.now() - startedAt < timeoutMs) {
        const anyLocked = lockPaths.some((lockPath) => fs.existsSync(lockPath));
        if (!anyLocked) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error("Chrome profile still appears to be in use. Close the X auth browser window completely and try again.");
}

async function isCdpEndpointReady(endpoint: string): Promise<boolean> {
    try {
        const response = await fetch(`${endpoint}/json/version`, { method: "GET" });
        return response.ok;
    } catch {
        return false;
    }
}

function hasPersistedXSessionCookies(profileDir: string): boolean {
    const cookiesPath = path.join(profileDir, "Default", "Cookies");
    if (!fs.existsSync(cookiesPath)) {
        return false;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mission-control-x-cookies-"));
    const tempDbPath = path.join(tempDir, "Cookies.sqlite");

    try {
        fs.copyFileSync(cookiesPath, tempDbPath);

        const query = `
select name
from cookies
where host_key in ('.x.com', 'x.com', '.twitter.com', 'twitter.com')
  and name in ('auth_token', 'ct0');
`;

        const output = execFileSync("sqlite3", [tempDbPath, query], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });

        const names = new Set(
            output
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean),
        );

        return names.has("auth_token") && names.has("ct0");
    } catch {
        return false;
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

async function main() {
    const terminal = readline.createInterface({ input, output });
    const { executablePath, launchArgs, profileDir, remoteDebuggingPort } = getXAuthBootstrapBrowserConfig();
    const cdpEndpoint = `http://127.0.0.1:${remoteDebuggingPort}`;

    if (!executablePath) {
        throw new Error(
            "Chrome executable not found. Set X_BROWSER_EXECUTABLE_PATH in .env.local to a branded Chrome binary.",
        );
    }

    let chromeProcess = null;
    const reusingExistingSession = await isCdpEndpointReady(cdpEndpoint);
    if (!reusingExistingSession) {
        if (isXAuthProfileLocked(profileDir)) {
            throw new Error(
                "Dedicated X profile is already in use, but no reusable CDP session was reachable. Close the existing dedicated X Chrome window completely and retry `npm run x:auth`.",
            );
        }

        chromeProcess = spawn(executablePath, launchArgs, {
            stdio: "ignore",
        });
    }

    try {
        console.log("");
        console.log("Mission Control X auth bootstrap");
        console.log(`Dedicated profile: ${profileDir}`);
        console.log(`CDP port: ${remoteDebuggingPort}`);
        if (reusingExistingSession) {
            console.log("Reusing the existing dedicated X Chrome session. No new browser window was launched.");
            console.log("1. Sign into X in that existing dedicated Chrome window.");
        } else {
            console.log("1. Sign into X in the opened Chrome window.");
        }
        console.log("2. If you use Google/SSO, complete it there. This is a normal Chrome process, not a Playwright-launched browser.");
        console.log("3. Wait until your timeline or the target post page is visible.");
        console.log("4. Close that Chrome window completely so the profile is saved cleanly.");
        console.log("5. Press Enter here and Mission Control will verify the saved X cookies.");
        console.log("");

        await terminal.question("Press Enter after X login is complete: ");
        await waitForProfileUnlock(profileDir);

        if (!hasPersistedXSessionCookies(profileDir)) {
            console.error("Saved X auth cookies were not found in the dedicated profile. Re-run `npm run x:auth` and finish the sign-in flow.");
            process.exitCode = 1;
            return;
        }

        console.log(JSON.stringify({ ok: true, authState: "ok", profileDir }, null, 2));
    } finally {
        terminal.close();
        chromeProcess?.kill("SIGTERM");
    }
}

main().catch((error) => {
    console.error(
        JSON.stringify(
            {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            },
            null,
            2,
        ),
    );
    process.exit(1);
});
