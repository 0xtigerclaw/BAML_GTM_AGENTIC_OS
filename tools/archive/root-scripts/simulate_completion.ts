import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function simulateCompletion() {
    // Find our test task
    const tasks = await client.query(api.tasks.list); // list exported? yes
    const task = tasks.find(t => t.title.includes("Test Mission for Tabs"));

    if (!task) {
        console.error("Test task not found!");
        return;
    }

    console.log(`Simulating completion for task: ${task._id}`);

    // 1. Append Writer Output
    await client.mutation(api.tasks.appendOutput, {
        id: task._id,
        title: "Writer Draft",
        content: "# Quantum Computing\n\nIt is like a magic coin that is heads AND tails.",
        agent: "Ogilvy"
    });

    // 2. Append Editor Output
    await client.mutation(api.tasks.appendOutput, {
        id: task._id,
        title: "Editor Feedback",
        content: "Make it punchier. Great analogy.",
        agent: "Carnegie"
    });

    // 3. Append Designer Output
    await client.mutation(api.tasks.appendOutput, {
        id: task._id,
        title: "Visual Brief",
        content: "A glowing quantum coin spinning in neon void.",
        agent: "Ive"
    });

    // 4. Force Handoff / Review
    // We update status to 'review' and assignedTo to 'Tigerclaw'
    // This triggers the gateway to run runTigerclawReview logic
    console.log("Setting status to review...");
    await client.mutation(api.tasks.handoff, {
        id: task._id,
        output: "Simualted completion.",
        agentName: "Ive" // Last agent
    });

    // Actually handoff logic might check workflow length.
    // If we want to force Review, we can just patch it directly or use handoff if currentStep is end.
    // But let's just patch it to be safe and fast.
    /*
    await client.mutation(api.tasks.updateStatus, {
        id: task._id,
        status: "review",
        output: "Ready for synthesis"
    });
    // But we need assignedTo Tigerclaw
    */

    // Let's us handoff but we need to ensure it goes to review.
    // If we are at step 0, handoff goes to step 1.
    // We want to skip to end.
    // So let's use internal patch logic via a custom mutation? No.
    // Let's just use `api.tasks.review`? No that's for APPROVAL.

    // We need the task to be picked up by Tigerclaw in 'review' state.
    // Handoff sets it to review if next step >= length.
    // So let's patch currentStep to end.

    // Patch via `internal`? No internal access here.
    // Does `updateStatus` allow patching arbitrary fields? No.
    // `handoff` does the logic.

    // Wait, `convex/tasks.ts` `handoff` handles `if (!task.workflow)`.
    // It also handles `nextStep >= length`.

    // We can't easily patch CurrentStep from client unless we have a mutation for it.
    // But `assignWithWorkflow` sets step to 0.

    // Let's try to just update status to 'review' and assignedTo 'Tigerclaw' via `assign`?
    // `assign` sets status to 'assigned'.

    // What if we use `handoff` but trick it?
    // No.

    // Actually, `simulated_completion` implies we skip the agents.
    // If I can't force the state, I might have to rely on `handoff` working through steps?
    // But I want to skip.

    // Wait `convex/tasks.ts` has `updateStatus` which takes `status` and `output`.
    // It does NOT take `assignedTo`.

    // `assign` sets assignedTo.

    // So:
    // 1. `updateStatus(id, "review")` -> status=review
    // 2. `assign(id, "Tigerclaw")` -> status=assigned (Override!)

    // This is tricky.
    // I need a mutation that sets both.
    // OR... I can add a temporary mutation or use `assign` then `updateStatus`?
    // If I `assign(Tigerclaw)`, status becomes `assigned`.
    // Gateway looks for `assigned` tasks for Tigerclaw?
    // If Tigerclaw sees an `assigned` task, does it run `runTigerclawReview`?
    // Let's check `gateway/index.ts`.

    // In `runAgentStep`:
    // `if (agentName === "Tigerclaw" && task.status === "review") { await runTigerclawReview(...) }`
    // So it MUST be `review` status.

    // If I `updateStatus("review")`, `assignedTo` remains "Ogilvy" (from before).
    // So Tigerclaw won't pick it up.

    // I need `assignedTo="Tigerclaw"` AND `status="review"`.

    // Maybe `handoff` can be called from step 2?
    // No, step 0.

    // I will use `handoff` repeatedly until it hits review?
    // Step 0 (Ogilvy) -> Handoff -> Step 1 (Carnegie) -> Handoff -> Step 2 (Ive) -> Handoff -> Review.
    // Yes! That's clean.

    console.log("Advancing workflow...");
    // 1. Ogilvy done
    await client.mutation(api.tasks.handoff, { id: task._id, agentName: "Ogilvy", output: "Checking out." });

    // 2. Carnegie done
    await client.mutation(api.tasks.handoff, { id: task._id, agentName: "Carnegie", output: "Checking out." });

    // 3. Ive done
    await client.mutation(api.tasks.handoff, { id: task._id, agentName: "Ive", output: "Checking out." });

    console.log("Task should now be in review with Tigerclaw.");
}

simulateCompletion();
