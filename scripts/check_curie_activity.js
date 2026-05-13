
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function checkActivity() {
    try {
        const activities = await client.query("agents:recentActivity", { limit: 20 });
        console.log("Recent Agent Activity:");
        console.table(activities.filter(a => a.agentName === "Curie").map(a => ({
            timestamp: new Date(a.timestamp).toLocaleTimeString(),
            type: a.type,
            content: a.content.substring(0, 100)
        })));
    } catch (e) {
        console.error("Failed to fetch activity:", e.message);
    }
}

checkActivity();
