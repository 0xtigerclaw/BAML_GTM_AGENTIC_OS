
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function inspectLatestTask() {
    try {
        const tasks = await client.query("tasks:list");
        const curieTask = tasks
            .filter(t => t.assignedTo === "Curie")
            .sort((a, b) => b._creationTime - a._creationTime)[0];

        if (!curieTask) {
            console.log("No tasks found for Curie.");
            return;
        }

        console.log(`Latest Task for Curie: ${curieTask.title} (${curieTask.status})`);
        console.log(`Created: ${new Date(curieTask._creationTime).toLocaleString()}`);
        console.log(`Description: ${curieTask.description}`);
        console.log("--- OUTPUT ---");
        console.log(curieTask.output || "(No output yet)");
    } catch (e) {
        console.error("Failed to inspect task:", e.message);
    }
}

inspectLatestTask();
