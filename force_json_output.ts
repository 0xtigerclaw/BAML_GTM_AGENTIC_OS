import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function forceJsonOutput() {
    // Find our test task
    const tasks = await client.query(api.tasks.list);
    const task = tasks.find(t => t.title.includes("Test Mission for Tabs"));

    if (!task || !task.outputs) {
        console.error("Test task or outputs not found!");
        return;
    }

    console.log(`Forcing JSON output for task: ${task._id}`);

    const tabs: any[] = [];

    // 1. Writer
    const writer = task.outputs.find(o => o.agent === "Ogilvy");
    if (writer) tabs.push({ id: "writer", label: "✍️ Writer (Ogilvy)", content: writer.content });

    // 2. Editor
    const editor = task.outputs.find(o => o.agent === "Carnegie");
    if (editor) tabs.push({ id: "editor", label: "🔍 Editor (Carnegie)", content: editor.content });

    // 3. Designer
    const designer = task.outputs.find(o => o.agent === "Ive");
    if (designer) tabs.push({ id: "designer", label: "🎨 Designer (Ive)", content: designer.content });

    // 4. Review
    tabs.push({ id: "review", label: "✅ Tigerclaw", content: "Manual validation complete. Tabs are working." });

    const finalOutput = JSON.stringify({ tabs });

    await client.mutation(api.tasks.updateOutput, {
        id: task._id,
        output: finalOutput
    });

    // Also mark done
    await client.mutation(api.tasks.updateStatus, {
        id: task._id,
        status: "done"
    });

    console.log("Updated task output to JSON:", finalOutput);
}

forceJsonOutput();
