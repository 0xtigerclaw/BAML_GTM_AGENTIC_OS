
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function listAgents() {
    try {
        const agents = await client.query("agents:list");
        console.table(agents.map(a => ({
            name: a.name,
            role: a.role,
            status: a.status
        })));
    } catch (e) {
        console.error("Failed to list agents:", e.message);
    }
}

listAgents();
