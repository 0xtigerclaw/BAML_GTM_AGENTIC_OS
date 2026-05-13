import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function inspectLastTask() {
    const tasks = await client.query(api.tasks.list);
    // Sort by creation time desc
    const sorted = tasks.sort((a, b) => b._creationTime - a._creationTime);
    const lastTask = sorted[0];

    if (!lastTask) {
        console.log("No tasks found.");
        return;
    }

    console.log("--- LAST TASK DETAILS ---");
    console.log(`ID: ${lastTask._id}`);
    console.log(`Title: ${lastTask.title}`);
    console.log(`Status: ${lastTask.status}`);
    console.log(`Assigned To: ${lastTask.assignedTo}`);
    console.log(`Current Step: ${lastTask.currentStep}`);
    console.log(`Workflow: ${JSON.stringify(lastTask.workflow, null, 2)}`);

    console.log("\n--- OUTPUTS ---");
    lastTask.outputs?.forEach((o, i) => {
        console.log(`[${i}] ${o.agent} (${new Date(o.createdAt).toISOString()}): ${o.title}`);
    });

    console.log("\n--- FULL OBJECT ---");
    console.log(JSON.stringify(lastTask, null, 2));
}

inspectLastTask();
