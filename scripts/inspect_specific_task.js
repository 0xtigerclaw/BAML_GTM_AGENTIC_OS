
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function inspectTaskOutput(taskId) {
    try {
        const tasks = await client.query("tasks:list");
        const task = tasks.find(t => t._id === taskId);

        if (!task) {
            console.log(`Task ${taskId} not found.`);
            return;
        }

        console.log(`Task: ${task.title}`);
        console.log("--- OUTPUT ---");
        console.log(task.output || "(No output)");
    } catch (e) {
        console.error("Failed to inspect task:", e.message);
    }
}

inspectTaskOutput("jh70sqxqd63nnq091z80j0snzh80pans");
