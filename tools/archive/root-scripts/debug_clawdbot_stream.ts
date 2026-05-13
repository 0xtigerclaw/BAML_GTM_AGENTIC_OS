import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

async function runTest() {
    const prompt = `You are Curie, a Deep Research (Scout v2.0).
    
    Current Mission:
    Scan for the latest high-impact AI news, focusing on open source models, agent frameworks, and infrastructure. Use the web_search tool to verified facts.
    `;

    const sessionId = `test-stream-${Date.now()}`;
    const binPath = './node_modules/.bin/clawdbot';

    console.log("Running STREAMING Clawdbot CLI test (No JSON flag)...");

    const child = spawn(binPath, ['agent', '--session-id', sessionId, '--message', prompt], {
        env: {
            ...process.env,
            PATH: (process.env.PATH || '') + ':/usr/local/bin',
            BRAVE_API_KEY: process.env.BRAVE_API_KEY,
            BRAVE_SEARCH_API_KEY: process.env.BRAVE_API_KEY // Try this alias too
        }
    });

    child.stdout.on('data', (data) => process.stdout.write(data));
    child.stderr.on('data', (data) => process.stderr.write(data));

    child.on('close', (code) => {
        console.log(`\nExit Code: ${code}`);
    });
}

runTest();
