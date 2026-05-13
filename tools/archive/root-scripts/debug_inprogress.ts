
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function debugInProgress() {
    console.log("Fetching in_progress tasks...");
    const tasks = await client.query(api.tasks.list);
    const inProgress = tasks.filter(t => t.status === "in_progress");

    if (inProgress.length === 0) {
        console.log("No in_progress tasks found.");
        return;
    }

    const t = inProgress[0];
    console.log("--- Task Details ---");
    console.log(`ID: ${t._id}`);
    console.log(`Title: ${t.title}`);
    console.log(`Status: ${t.status}`);
    console.log(`Assigned To: ${t.assignedTo}`);
    console.log(`Workflow: ${t.workflow}`);
    console.log(`Created At: ${t._creationTime} (${new Date(t._creationTime).toLocaleString()})`);

    console.log("\n--- Subtasks ---");
    if (t.subtasks && t.subtasks.length > 0) {
        t.subtasks.forEach((st: any, i: number) => {
            console.log(`[${i}] ${st.title} (${st.status}) - Agent: ${st.agentId}`);
        });
    } else {
        console.log("No subtasks.");
    }

    console.log("\n--- Outputs ---");
    if (t.outputs && t.outputs.length > 0) {
        t.outputs.forEach((o: any, i: number) => {
            console.log(`[${i}] ${o.title}: ${o.content.slice(0, 100)}...`);
        });
    } else {
        console.log("No outputs.");
    }

    console.log("\n--- Chat History (Last 3) ---");
    if (t.chatHistory && t.chatHistory.length > 0) {
        const last3 = t.chatHistory.slice(-3);
        last3.forEach((msg: any) => {
            console.log(`[${msg.role}]: ${msg.content.slice(0, 200)}...`);
        });
    }
}

debugInProgress();
