
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function triggerIntelligentScan() {
    console.log("🚀 Triggering Intelligent Scout Scan...");
    try {
        // Since triggerScoutWithData is an action, we use client.action
        // In this environment, we might need to find the internal API reference or just call it if we know the path
        // For convenience, I'll just use the regular mutation if I can't call the action easily, 
        // but I want to verify the ACTION logic.

        // Actually, ConvexHttpClient supports .action
        const taskId = await client.action("rssActions:triggerScoutWithData", {});
        console.log(`✅ Intelligent Mission Created! Task ID: ${taskId}`);
    } catch (e) {
        console.error("❌ Failed to trigger scan:", e.message);
    }
}

triggerIntelligentScan();
