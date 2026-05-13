import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🚀 Triggering Intelligent 'Daily Scan' Mission...");

    try {
        const taskId = await client.action(api.rssActions.triggerScoutWithData, {});
        console.log(`✅ Intelligent Mission Created! Task ID: ${taskId}`);
        console.log("👉 I've pre-fetched all active RSS feeds and injected them into the task description.");
        console.log("👉 Curie will now process this data without needing the rss_parse tool.");
    } catch (error) {
        console.error("❌ Failed to create mission:", error);
    }
}

main();
