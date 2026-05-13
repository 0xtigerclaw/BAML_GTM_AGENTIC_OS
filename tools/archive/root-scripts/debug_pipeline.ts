import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Inspecting Task Pipeline State...");
    const tasks = await client.query(api.tasks.list);

    // Sort by creation time (using _creationTime if available, or just reverse list)
    const recentTasks = tasks.slice(-3); // Get last 3 tasks

    if (recentTasks.length === 0) {
        console.log("No tasks found.");
        return;
    }

    for (const task of recentTasks) {
        console.log(`\n------------------------------------------------`);
        console.log(`ID: ${task._id}`);
        console.log(`Title: "${task.title}"`);
        console.log(`Status: [ ${task.status} ]`);
        console.log(`Assigned To: ${JSON.stringify(task.assignedTo)}`);
        console.log(`Workflow: ${JSON.stringify(task.workflow)}`);
        console.log(`Current Step: ${task.currentStep}`);

        if (task.output) {
            console.log(`Output Length: ${task.output.length} chars`);
            console.log(`Last 100 chars of output: ...${task.output.slice(-100).replace(/\n/g, '\\n')}`);
        }

        if (task.outputs) {
            console.log(`Detailed Outputs: ${task.outputs.length} steps`);
            task.outputs.forEach((o: any) => {
                console.log(`  - Step ${o.stepNumber}: ${o.title} (by ${o.agent})`);
            });
        }
    }
    console.log(`\n------------------------------------------------`);
}

main();
