import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🧪 Testing Status Mutation...");

    const allTasks = await client.query(api.tasks.list);
    const target = allTasks.find(t => t.status === "assigned" && t.title.includes("design"));

    if (!target) {
        console.error("❌ No target task found.");
        return;
    }

    console.log(`Target Task: "${target.title}" (${target._id})`);
    console.log(`Current Status: ${target.status}`);

    try {
        console.log("Attempting `updateStatus` mutation...");
        await client.mutation(api.tasks.updateStatus, {
            id: target._id,
            status: "in_progress"
        });
        console.log("✅ Mutation returned.");

        const refetched = await client.query(api.tasks.get, { id: target._id });
        console.log(`New Status: ${refetched?.status}`);

        if (refetched?.status === "in_progress") {
            console.log("🎉 SUCCESS: Backend is responsive.");
        } else {
            console.error("❌ FAILURE: Status did not update.");
        }

    } catch (e: any) {
        console.error("❌ EXCEPTION during mutation:", e);
    }
}

main();
