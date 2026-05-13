import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Dumping Agent Activity Log (Last 50 entries)...");

    const activities = await client.query(api.agents.recentActivity); // This usually limits to 50

    // Sort reverse chronological
    // Usually they come sorted? Let's print them.

    if (activities.length === 0) {
        console.log("No activity found.");
        return;
    }

    console.log("\nTimestamp | Agent | Type | Content");
    console.log("---------------------------------------------------");
    for (const log of activities) {
        console.log(`[${new Date(log._creationTime).toLocaleTimeString()}] ${log.agentName} [${log.type}]: ${log.content.substring(0, 100)}...`);
    }
}

main();
