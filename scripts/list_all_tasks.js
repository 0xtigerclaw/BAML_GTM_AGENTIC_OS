
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function listAllTasks() {
    try {
        const tasks = await client.query("tasks:list");
        console.log("All Tasks:");
        console.table(tasks.map(t => ({
            id: t._id,
            title: t.title,
            status: t.status,
            assignedTo: JSON.stringify(t.assignedTo),
            workflow: JSON.stringify(t.workflow),
            step: t.currentStep
        })));
    } catch (e) {
        console.error("Failed to list tasks:", e.message);
    }
}

listAllTasks();
