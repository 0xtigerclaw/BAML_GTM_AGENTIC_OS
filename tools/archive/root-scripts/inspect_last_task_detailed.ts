import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function inspectLastTaskDetailed() {
    const tasks = await client.query(api.tasks.list);
    const sorted = tasks.sort((a, b) => b._creationTime - a._creationTime);
    const lastTask = sorted[0];

    if (!lastTask) {
        console.log("No tasks found.");
        return;
    }

    console.log(`\n=== TASK: ${lastTask.title} ===`);
    console.log(`ID: ${lastTask._id}`);
    console.log(`Status: ${lastTask.status}`);
    console.log(`Assigned: ${lastTask.assignedTo}`);
    console.log(`Step: ${lastTask.currentStep} / ${lastTask.workflow?.length}`);
    console.log(`Workflow: ${JSON.stringify(lastTask.workflow)}`);

    console.log(`\n=== OUTPUT ARRAY (task.outputs) ===`);
    if (lastTask.outputs && lastTask.outputs.length > 0) {
        lastTask.outputs.forEach((o, i) => {
            console.log(`\n[Output #${i + 1}] Agent: ${o.agent} | Title: ${o.title}`);
            console.log(`Content Preview: ${o.content.substring(0, 100)}...`);
        });
    } else {
        console.log("No structured outputs found.");
    }

    console.log(`\n=== RAW OUTPUT STRING (task.output) ===`);
    // Print the raw string to see if agents appended text there
    const rawOutput = lastTask.output || "";
    console.log(rawOutput.length > 2000 ? rawOutput.substring(rawOutput.length - 2000) : rawOutput);

    console.log("\n=== CHECKS ===");
    console.log(`Has Ogilvy? ${rawOutput.includes("Ogilvy")}`);
    console.log(`Has Carnegie? ${rawOutput.includes("Carnegie")}`);
    console.log(`Has Ive? ${rawOutput.includes("Ive")}`);
}

inspectLastTaskDetailed();
