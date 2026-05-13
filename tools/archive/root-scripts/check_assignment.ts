import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Checking latest task assignment...");
    const tasks = await client.query(api.tasks.list);
    // Sort by creation time desc (if possible, or just grab the last one)
    // Assuming ID or intrinsic order
    const latestTask = tasks[tasks.length - 1]; // Naive approach

    if (latestTask) {
        console.log(`Task: "${latestTask.title}"`);
        console.log(`Status: ${latestTask.status}`);
        console.log(`Assigned To: ${latestTask.assignedTo}`);
    } else {
        console.log("No tasks found.");
    }
}

main();
