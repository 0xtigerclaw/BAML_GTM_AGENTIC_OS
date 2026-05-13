import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import * as fs from "fs";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Inspecting Task Output...");
    const searchTitle = "Test 7";

    const tasks = await client.query(api.tasks.list);
    // Sort tasks by creation time desc
    tasks.sort((a, b) => b._creationTime - a._creationTime);

    const task = tasks.find(t => t.title.includes(searchTitle));

    if (!task) {
        console.log("❌ Task not found");
        return;
    }

    console.log(`🆔 ID: ${task._id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Status: ${task.status}`);
    console.log(`Step: ${task.currentStep}`);
    console.log(`Workflow: ${JSON.stringify(task.workflow)}`);

    const outputPath = "debug_task_output.md";
    fs.writeFileSync(outputPath, task.output || "(No output)");

    console.log(`✅ Output written to ${outputPath}`);
}

main();
