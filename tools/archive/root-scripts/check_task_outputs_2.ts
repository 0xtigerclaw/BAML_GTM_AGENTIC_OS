
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkTaskOutputs2() {
    const tasks = await client.query(api.tasks.list);
    const task = tasks.find(t => t.title.includes("Codex App") && t.title.includes("Antigravity"));

    if (!task) {
        console.log("Task not found via title search");
        return;
    }

    console.log(`Task Found: ${task.title}`);
    console.log(`ID: ${task._id}`);

    if (task.outputs && task.outputs.length > 0) {
        console.log("--- Outputs ---");
        task.outputs.forEach((o, i) => {
            console.log(`[${i}] Title: "${o.title}" | Agent: ${o.agent} | Length: ${o.content.length}`);
        });
    } else {
        console.log("No structured outputs found.");
    }
}

checkTaskOutputs2();
