
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function fixStuckTask() {
    console.log("Checking for stuck tasks...");
    const tasks = await client.query(api.tasks.list);

    // Find failed motion video tasks
    const stuckTasks = tasks.filter(t =>
        t.title.includes("motion video")
    );

    if (stuckTasks.length === 0) {
        console.log("No matching tasks found.");
        return;
    }

    for (const t of stuckTasks) {
        console.log(`Resetting task: ${t.title} (ID: ${t._id})`);

        // Reset to inbox
        await client.mutation(api.tasks.updateStatus, {
            id: t._id,
            status: "inbox"
        });

        console.log("✅ Reset to INBOX");
    }
}

fixStuckTask();
