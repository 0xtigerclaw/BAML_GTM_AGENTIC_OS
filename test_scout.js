require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');

async function testScout() {
    console.log("🧪 Testing Scout Tool Integration...");
    console.log("DEBUG: BRAVE_API_KEY present:", !!process.env.BRAVE_API_KEY);
    console.log("DEBUG: Mapped Key:", process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY);

    // 1. Simulate a task that requires Web Search
    const prompt = `You are Curie (Scout). 
    TASK: Search for the latest release of "Next.js" in the last 24 hours.
    REQUIREMENT: Use the 'web_search' tool.
    OUTPUT: A short summary of the version number and key features.`;

    const child = spawn('./node_modules/.bin/clawdbot', [
        'agent',
        '--local',
        '--session-id', `test-scout-tooling-${Date.now()}`,
        '--message', prompt,
        '--json'
    ], {
        env: {
            ...process.env,
            PATH: (process.env.PATH || '') + ':/usr/local/bin',
            // Explicitly pass BRAVE_API_KEY as Clawdbot expects this specific name
            BRAVE_API_KEY: process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY,
            CLAWDBOT_CONFIG_PATH: '/Users/swayam/.config/clawdbot/config.json'
        }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);

    child.on('close', code => {
        console.log(`Exit Code: ${code}`);
        if (code !== 0) {
            console.error(stderr);
            process.exit(1);
        }

        console.log("RAW STDOUT:", stdout);
        console.log("RAW STDERR:", stderr);

        try {
            const fs = require('fs');
            fs.writeFileSync('test_scout_output.json', stdout);
            const res = JSON.parse(stdout);
            console.log("--- AGENT OUTPUT ---");
            console.log(res.result?.payloads?.[0]?.text);

            if (stdout.includes("web_search")) {
                console.log("\n✅ SUCCESS: Tool usage detected in logs (internal)");
            } else {
                console.log("\n⚠️ NOTE: Check internal logs to confirm tool execution, as JSON output contains final text only.");
            }
        } catch (e) {
            console.error("Failed to parse JSON:", stdout);
        }
    });
}

testScout();
