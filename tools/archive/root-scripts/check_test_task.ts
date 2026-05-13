
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkTestTask() {
    // Get the most recent task with this title
    const tasks = await client.query(api.tasks.list);
    console.log("Found", tasks.length, "tasks.");

    // Log recent tasks
    const recent = tasks.sort((a, b) => b._creationTime - a._creationTime).slice(0, 5);
    recent.forEach(t => console.log(`[${new Date(t._creationTime).toISOString()}] ${t.title} (${t.status})`));

    const testTask = tasks
        .filter(t => t.title.includes("Research AI Agents"))
        .sort((a, b) => b._creationTime - a._creationTime)[0];

    if (testTask) {
        console.log(`\n--- Task: ${testTask.title} ---`);
        console.log(`ID: ${testTask._id}`);
        console.log(`Status: ${testTask.status}`);
        console.log(`Assigned To: ${testTask.assignedTo}`);
        console.log("---------------------------------------------------");
        console.log("FULL OUTPUT CONTENT:");
        console.log(testTask.output);
        console.log("---------------------------------------------------");
    } else {
        console.log("Task not found.");
    }
}

checkTestTask();
