import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function debugGateway() {
    console.log("Checking pending tasks for Ogilvy...");
    const tasks = await client.query(api.tasks.listPending, { agentName: "Ogilvy" });
    console.log(`Found ${tasks.length} tasks.`);
    if (tasks.length > 0) {
        console.log("First task:", tasks[0].title, tasks[0].status);
    }
}

debugGateway();
