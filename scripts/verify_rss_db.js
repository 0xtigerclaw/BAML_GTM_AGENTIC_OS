
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');
// We dynamic import the api since we are in a CJS environment and _generated/api is likely ESM or TS
// Actually, in mission-control it seems to be TS.
// Let's just try to hit the URL directly if we can't load the API easily.
// Or better, let's look at convex/rss.ts to see the query path.

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function listSources() {
    try {
        const sources = await client.query("rss:list"); // Path from convex/rss.ts
        console.log("RSS Sources in Database:");
        console.table(sources.map(s => ({
            name: s.name,
            url: s.url,
            category: s.category,
            active: s.active,
            lastScrapedAt: s.lastScrapedAt ? new Date(s.lastScrapedAt).toLocaleTimeString() : 'Never'
        })));
    } catch (e) {
        console.error("Failed to list sources:", e.message);
    }
}

listSources();
