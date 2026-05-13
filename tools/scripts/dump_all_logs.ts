import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔍 Dumping ALL Agent Activity (Last 100)...");

    const activities = await client.query(api.agents.recentActivity);

    // Sort chronological
    if (!activities) { console.log("No activities."); return; }

    const sorted = [...activities].reverse(); // API returns desc usually? "recentActivity" sounds like desc.

    console.log("\nTimestamp | Agent | Type | Content");
    console.log("---------------------------------------------------");
    for (const log of sorted) {
        // Filter out heartbeats to reduce noise
        if (log.type === "heartbeat") continue;

        console.log(`[${new Date(log._creationTime).toLocaleTimeString()}] ${log.agentName} [${log.type}]: ${log.content.substring(0, 150)}...`);
    }
}

main();
