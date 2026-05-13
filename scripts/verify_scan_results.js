
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function verifyCurieScanResults() {
    try {
        const tasks = await client.query("tasks:list");
        const curieTask = tasks.find(t => t.assignedTo === "Curie" && t.status === "done");

        if (!curieTask) {
            console.log("No finished Curie task found yet.");
            return;
        }

        console.log(`Verified Task: ${curieTask.title} (DONE)`);

        const links = await client.query("links:list");
        const taskLinks = links.filter(l => l.taskId === curieTask._id);

        console.log(`Found ${taskLinks.length} links saved by the Scout Bridge for this task.`);
        if (taskLinks.length > 0) {
            console.table(taskLinks.map(l => ({
                title: l.title,
                url: l.url,
                quality: l.qualityScore
            })));
        }

        const sources = await client.query("rss:list");
        console.log("RSS Sources Scraped Times:");
        console.table(sources.map(s => ({
            name: s.name,
            lastScrapedAt: s.lastScrapedAt ? new Date(s.lastScrapedAt).toLocaleString() : "Never"
        })));

    } catch (e) {
        console.error("Failed to verify results:", e.message);
    }
}

verifyCurieScanResults();
