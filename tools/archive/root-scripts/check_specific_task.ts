
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkSpecificTask() {
    console.log("Searching for task: 'motion video for our multi-agent system'...");
    const tasks = await client.query(api.tasks.list);

    // Fuzzy match title
    const target = tasks.find(t => t.title.toLowerCase().includes("motion video"));

    if (target) {
        console.log(`\n--- FOUND TASK ---`);
        console.log(`ID: ${target._id}`);
        console.log(`Title: ${target.title}`);
        console.log(`Status: ${target.status}`);
        console.log(`Assigned To: ${target.assignedTo}`);
        console.log(`Workflow: ${target.workflow}`);
        console.log(`Feedback: ${target.feedback}`);
        console.log(`Creation Time: ${new Date(target._creationTime).toLocaleString()}`);

        console.log("\n--- OUTPUTS ---");
        if (target.outputs && target.outputs.length > 0) {
            target.outputs.forEach((o: any, i: number) => {
                console.log(`[${i}] ${o.title}: ${o.content.slice(0, 150)}...`);
            });
            const last = target.outputs[target.outputs.length - 1];
            console.log(`\nLAST OUTPUT FULL CONTENT:\n${last.content}`);
        } else {
            console.log("No outputs found.");
            console.log(`Legacy Output: ${target.output}`);
        }

        console.log("\n--- CHAT HISTORY (Last 5) ---");
        if (target.chatHistory) {
            target.chatHistory.slice(-5).forEach((msg: any) => {
                console.log(`[${msg.role}]: ${msg.content.slice(0, 200)}...`);
            });
        }
    } else {
        console.log("Could not find task with title containing 'motion video'");
    }
}

checkSpecificTask();
