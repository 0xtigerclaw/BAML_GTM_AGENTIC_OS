import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🐞 Debugging Parallel Execution...");

    // 1. Create a parallel task
    console.log("1. Creating parallel task (Torvalds + Curie)...");
    const taskId = await client.mutation(api.tasks.create, {
        title: "Debug Parallel Task",
        description: "Testing parallel handoff logic",
        workflow: [["Torvalds", "Curie"], "Tigerclaw"] as any
    });
    console.log("   Task ID:", taskId);

    // 2. Refresh and check status
    let task = await client.query(api.tasks.get, { id: taskId });
    console.log("   Initial Status:", task?.status);
    console.log("   Initial AssignedTo:", task?.assignedTo);

    if (!Array.isArray(task?.assignedTo) || task?.assignedTo.length !== 2) {
        console.error("❌ Failed to assign to array!");
        return;
    }

    // 3. Simulate Torvalds finishing
    console.log("\n2. Torvalds completes step...");
    await client.mutation(api.tasks.handoff, {
        id: taskId,
        output: "Torvalds done.",
        agentName: "Torvalds"
    });

    task = await client.query(api.tasks.get, { id: taskId });
    console.log("   Status:", task?.status);
    console.log("   AssignedTo:", task?.assignedTo);

    if (!Array.isArray(task?.assignedTo) || task?.assignedTo.length !== 1 || task?.assignedTo[0] !== "Curie") {
        console.error("❌ Torvalds failed to be removed from assignedTo!");
        // return; // Continue anyway to see what happens
    } else {
        console.log("✅ Torvalds removed correctly.");
    }

    // 4. Simulate Curie finishing
    console.log("\n3. Curie completes step...");
    await client.mutation(api.tasks.handoff, {
        id: taskId,
        output: "Curie done.",
        agentName: "Curie"
    });

    task = await client.query(api.tasks.get, { id: taskId });
    console.log("   Status:", task?.status);
    console.log("   AssignedTo:", task?.assignedTo);
    console.log("   CurrentStep:", task?.currentStep);

    if (task?.assignedTo === "Tigerclaw" && task?.status === "review") {
        console.log("✅ Successfully advanced to Tigerclaw for review!");
    } else {
        console.error("❌ Failed to advance to next stage!");
    }
}

main();
