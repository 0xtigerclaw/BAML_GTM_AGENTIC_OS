
import { api } from "./convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    const tasks = await client.query(api.tasks.list);
    const doneTask = tasks.find(t => t.status === "done");

    if (doneTask && doneTask.outputs) {
        const editorOutput = doneTask.outputs.find(o => o.agent === "Carnegie");
        if (editorOutput) {
            console.log("Found Carnegie Output:");
            console.log(editorOutput.content); // Print the raw content string
        } else {
            console.log("Carnegie output not found in done task.");
        }
    } else {
        console.log("No done task with outputs found.");
    }
}

main().catch(console.error);
