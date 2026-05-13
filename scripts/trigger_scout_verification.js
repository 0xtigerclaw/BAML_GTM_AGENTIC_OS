
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function triggerVerificationTask() {
    try {
        console.log("Triggering 'News Scout' mission for Curie...");
        const taskId = await client.mutation("tasks:create", {
            title: "News Scout: Verify RSS Sources",
            description: "Scan the registered RSS sources for the latest AI news. Focus on OpenAI and Vercel. Use the rss_parse tool or equivalent to fetch the feed data and save high-quality findings to our database.",
            priority: "high"
        });
        console.log(`Mission triggered! Task ID: ${taskId}`);
        console.log("Now check the Scout Dashboard (app/scout) or running gateway logs to see Curie in action.");
    } catch (e) {
        console.error("Failed to trigger mission:", e.message);
    }
}

triggerVerificationTask();
