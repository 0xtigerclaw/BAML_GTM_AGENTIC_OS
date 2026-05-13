import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Checking Scouted Links...");

    // 1. List Pending Links (using listByStatus or just raw query if needed, assume listByStatus exists)
    const links = await client.query(api.links.listByStatus, { status: "pending" });

    console.log(`Found ${links.length} pending links.`);

    if (links.length > 0) {
        const linkToApprove = links[0];
        console.log(`\n👉 Approving Link: "${linkToApprove.title}"`);
        console.log(`   URL: ${linkToApprove.url}`);

        // 2. Approve it
        await client.mutation(api.links.reviewLink, {
            id: linkToApprove._id,
            status: "approved",
            feedback: "Debug Test: Approved by Antigravity for Verification"
        });

        console.log("✅ Link approved! Task should be created now.");

        // 3. Wait a moment and find the new task
        console.log("⏳ Waiting for task creation...");
        await new Promise(r => setTimeout(r, 2000));

        const tasks = await client.query(api.tasks.list);
        tasks.sort((a, b) => b._creationTime - a._creationTime);
        const newTask = tasks.find(t => t.title.includes(linkToApprove.title!) || t.description?.includes(linkToApprove.url));

        if (newTask) {
            console.log(`\n🎉 NEW TASK CREATED!`);
            console.log(`ID: ${newTask._id}`);
            console.log(`Title: ${newTask.title}`);
            console.log(`Workflow: ${JSON.stringify(newTask.workflow)}`);
            console.log(`Status: ${newTask.status}`);
            console.log(`Assigned To: ${JSON.stringify(newTask.assignedTo)}`);

            if (newTask.workflow && !newTask.workflow.includes("Tigerclaw") && newTask.workflow.length === 3) {
                console.log("✅ Workflow looks correct (Ogilvy -> Carnegie -> Ive)");
            } else {
                console.log("❌ Workflow looks WRONG! Expected: Ogilvy, Carnegie, Ive");
            }
        } else {
            console.log("❌ Failed to find the created task.");
        }

    } else {
        console.log("⚠️ No pending links found to test. Verify 'Daily Scan' actually produced links.");
    }
}

main();
