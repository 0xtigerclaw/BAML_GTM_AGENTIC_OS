import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type TaskLike = {
    title: string;
    status: string;
    _creationTime: number;
    assignedTo?: string | string[];
};

async function main() {
    const tasks = (await client.query(api.tasks.list)) as TaskLike[];
    const ledgerTasks = tasks
        .filter((task) => task.title.startsWith("Daily Project Ledger Update - "))
        .sort((first, second) => second._creationTime - first._creationTime);

    if (ledgerTasks.length === 0) {
        console.log("No daily ledger task found yet.");
        process.exit(1);
    }

    const latest = ledgerTasks[0];
    console.log("Latest daily ledger task:");
    console.log(`- title: ${latest.title}`);
    console.log(`- status: ${latest.status}`);
    console.log(`- assignedTo: ${Array.isArray(latest.assignedTo) ? latest.assignedTo.join(", ") : (latest.assignedTo || "unassigned")}`);
    console.log(`- createdAt: ${new Date(latest._creationTime).toISOString()}`);
}

main().catch((error) => {
    console.error("Failed to check ledger task status:", error);
    process.exit(1);
});
