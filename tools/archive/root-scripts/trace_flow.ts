import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Tracing Task Flow...");
    const searchTitle = "Codex CLI";

    // 1. Find the Task
    const tasks = await client.query(api.tasks.list);
    // Sort tasks by creation time desc to get the latest
    tasks.sort((a, b) => b._creationTime - a._creationTime);

    const task = tasks.find(t => t.title.includes(searchTitle));

    if (!task) {
        console.log(`❌ Task with title containing "${searchTitle}" not found.`);
        return;
    }

    console.log(`\n📄 Task: "${task.title}"`);
    console.log(`🆔 ID: ${task._id}`);
    console.log(`📅 Created: ${new Date(task._creationTime).toLocaleString()}`);
    console.log(`🚦 Status: ${task.status}`);
    console.log(`👤 Currently Assigned: ${JSON.stringify(task.assignedTo)}`);
    console.log(`🔄 Workflow Definition: ${JSON.stringify(task.workflow)}`);
    console.log(`📍 Current Step Index: ${task.currentStep} (Task says step ${task.currentStep} of workflow)`);

    console.log(`\n📜 Execution History (Outputs):`);
    if (task.outputs && task.outputs.length > 0) {
        task.outputs.forEach((output: any, index: number) => {
            console.log(`  [Step ${index + 1}] 👤 Agent: ${output.agent}`);
            console.log(`     - Title: ${output.title}`);
            console.log(`     - Content Length: ${output.content.length} chars`);
            // console.log(`     - Preview: ${output.content.substring(0, 50).replace(/\n/g, ' ')}...`);
        });
    } else {
        console.log("  No outputs recorded yet.");
    }
    console.log(`\n📄 Final Combined Output Length: ${task.output ? task.output.length : 0} chars`);
    if (task.output) console.log(`Preview: ${task.output.substring(0, 200)}...`);

    // 2. Fetch Activity Logs (proxy for timeline)
    // We'll search for logs containing the task ID or title
    console.log(`\n🕵️‍♀️ Activity Log Trace (Related Events):`);
    const activities = await client.query(api.agents.recentActivity, { limit: 100 });

    // Filter locally because we can't query by content easily
    const relatedLogs = activities.filter(a =>
        a.content.includes(task.title) ||
        a.content.includes(task._id) ||
        (task.outputs && task.outputs.some((o: any) => a.content.includes(o.title)))
    );

    // Sort by time
    relatedLogs.sort((a, b) => a._creationTime - b._creationTime);

    if (relatedLogs.length === 0) {
        console.log("  No specific activity logs found matching task title.");
    } else {
        relatedLogs.forEach(log => {
            console.log(`  [${new Date(log._creationTime).toLocaleTimeString()}] 🤖 ${log.agentName} (${log.type}): ${log.content}`);
        });
    }
}

main();
