
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function inspectScoutScanTask() {
    try {
        const tasks = await client.query("tasks:list");
        const targetTask = tasks.find(t => t.title === "Scout Scan: 2/7/2026");

        if (!targetTask) {
            console.log("Task 'Scout Scan: 2/7/2026' not found.");
            // List titles to see if formatting is different
            console.log("Available tasks:", tasks.map(t => t.title));
            return;
        }

        console.log(`Task ID: ${targetTask._id}`);
        console.log(`Status: ${targetTask.status}`);
        console.log(`Outputs Count: ${targetTask.outputs?.length || 0}`);
        console.log("--- LATEST OUTPUT ---");
        console.log(targetTask.output || "(No output yet)");

        if (targetTask.outputs) {
            console.log("--- STRUCTURED OUTPUTS ---");
            targetTask.outputs.forEach(o => {
                console.log(`Agent: ${o.agent} (${o.title})`);
                console.log(o.content.substring(0, 500) + "...");
                console.log("---");
            });
        }
    } catch (e) {
        console.error("Failed to inspect task:", e.message);
    }
}

inspectScoutScanTask();
