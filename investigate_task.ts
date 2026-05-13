
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function investigateTask() {
    const tasks = await client.query(api.tasks.list);
    const task = tasks.find(t => t.title.includes("Codex App"));

    if (!task) {
        console.log("Task not found!");
        return;
    }

    console.log("\n--- Task Details ---");
    console.log(`ID: ${task._id}`);
    console.log(`Status: ${task.status}`);
    console.log(`Assigned To: ${task.assignedTo}`);
    console.log(`Current Step: ${task.currentStep}`);
    console.log(`Output Length: ${task.output?.length || 0}`);
    console.log(`Feedback: ${task.feedback || "None"}`);

    if (task.output) {
        console.log("\n--- Partial Output Snippet ---");
        console.log(task.output.substring(0, 200) + "...");
    }

    console.log("\n--- Recent Activity for Ogilvy ---");
    const activities = await client.query(api.agents.recentActivity);
    const ogilvyLogs = activities.filter(a => a.agentName === "Ogilvy" || a.content.includes(task.title));

    ogilvyLogs.forEach(log => {
        console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] [${log.type}] ${log.content}`);
    });
}

investigateTask();
