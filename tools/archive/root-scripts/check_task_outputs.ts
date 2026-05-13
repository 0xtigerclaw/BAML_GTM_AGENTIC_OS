
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkTaskOutputs() {
    const taskId = "jh711148cm4a2swd6qdqg9dbmd80emmk"; // ID from previous log
    const task = await client.query(api.tasks.get, { id: taskId });

    if (!task) {
        console.log("Task not found");
        return;
    }

    console.log(`Task: ${task.title}`);
    console.log(`Status: ${task.status}`);

    if (task.outputs && task.outputs.length > 0) {
        console.log("--- Outputs ---");
        task.outputs.forEach((o, i) => {
            console.log(`[${i}] Title: "${o.title}" | Agent: ${o.agent} | Length: ${o.content.length}`);
        });
    } else {
        console.log("No structured outputs found.");
    }
}

checkTaskOutputs();
