import { spawn } from 'child_process';
import * as path from 'path';

async function runTest() {
    const prompt = `You are Curie, a Deep Research (Scout v2.0).
    
    Current Mission:
    Scan for the latest high-impact AI news, focusing on open source models, agent frameworks, and infrastructure. Use the web_search tool to verified facts.
    `;

    const sessionId = `mission-control-curie-test-${Date.now()}`;
    const binPath = './node_modules/.bin/clawdbot';

    console.log("Running Clawdbot CLI test...");

    const child = spawn(binPath, ['agent', '--session-id', sessionId, '--message', prompt, '--json'], {
        env: { ...process.env, PATH: (process.env.PATH || '') + ':/usr/local/bin' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => stdout += data.toString());
    child.stderr.on('data', (data) => stderr += data.toString());

    child.on('close', (code) => {
        console.log(`Exit Code: ${code}`);
        console.log("--- STDOUT ---");
        console.log(stdout);
        console.log("--- STDERR ---");
        console.log(stderr);
        console.log("--- END ---");
    });
}

runTest();
