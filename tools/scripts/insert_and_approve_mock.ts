import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🧪 Inserting Mock Link for Testing...");

    // 0. Create Dummy Task for ID
    const dummyTaskId = await client.mutation(api.tasks.create, { title: "Mock Scout Task" });
    console.log(`✅  Created Dummy Task: ${dummyTaskId}`);

    // 1. Insert Mock Link
    const mockTitle = "DeepSeek release V3 open weights (Test 7)";
    const mockId = await client.mutation(api.links.addLink, {
        url: "https://deepseek.com/news/v3-release?test=7",
        title: mockTitle,
        summary: "DeepSeek has released V3 of their model with open weights, claiming performance parity with GPT-4 at 1/10th the inference cost. The model is a Mixture-of-Experts architecture.",
        agent: "SystemTest",
        taskId: dummyTaskId,
        tags: ["AI", "Open Source"],
        qualityScore: 9
    });

    console.log(`✅ Mock Link Inserted: ${mockId}`);

    // 2. Approve it immediately
    console.log("👉 Approving Mock Link...");
    await client.mutation(api.links.reviewLink, {
        id: mockId,
        status: "approved",
        feedback: "Focus on the cost disruption angle. This is a game changer for startups. Write a killer LinkedIn post."
    });

    console.log("✅ Approved. Task should be created.");

    // 3. Monitor for Task
    console.log("⏳ Polling for task completion...");

    const maxRetries = 60; // 5 minutes approx
    let taskFound = false;

    for (let i = 0; i < maxRetries; i++) {
        const tasks = await client.query(api.tasks.list);
        // Find the task created by approval (starts with "Draft Content: " + mockTitle)
        const task = tasks.find(t => t.title.includes(mockTitle) && t.title.startsWith("Draft Content"));

        if (task) {
            if (!taskFound) {
                console.log(`🎉 Task Created: "${task.title}" (ID: ${task._id})`);
                taskFound = true;
            }

            console.log(`   [${i * 5}s] Status: ${task.status} | Step: ${task.currentStep} | Agent: ${JSON.stringify(task.assignedTo)}`);

            if (task.status === "done") {
                console.log("✅ Task Completed!");
                return;
            }
        }

        await new Promise(r => setTimeout(r, 5000));
    }

    console.log("⚠️ Timed out waiting for task completion.");
}

main();
