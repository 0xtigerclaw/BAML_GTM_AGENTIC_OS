import { spawn } from 'child_process';

async function runTest() {
    const prompt = "Hello, who are you?";
    const sessionId = `test-simple-${Date.now()}`;
    const binPath = './node_modules/.bin/clawdbot';

    console.log("Running SIMPLE Clawdbot CLI test...");

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
    });
}

runTest();
