
require('dotenv').config({ path: '.env.local' });
const { ConvexHttpClient } = require('convex/browser');
const { api } = require('../convex/_generated/api');

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function reprocessTask(taskId) {
    console.log(`Reprocessing Task: ${taskId}`);
    try {
        const tasks = await client.query("tasks:list");
        const task = tasks.find(t => t._id === taskId);
        if (!task) throw new Error("Task not found");

        const allReports = [task.output || ""];
        if (task.outputs) {
            task.outputs.forEach(o => allReports.push(o.content));
        }

        let savedCount = 0;

        for (const report of allReports) {
            if (!report) continue;

            try {
                // Extract JSON block
                const jsonMatch = report.match(/```json\n([\s\S]*?)\n```/) || report.match(/\{[\s\S]*\}/);
                if (!jsonMatch) continue;

                const jsonStr = jsonMatch[1] || jsonMatch[0];
                const data = JSON.parse(jsonStr);

                let candidates = [];
                if (data.candidates) candidates = data.candidates;
                else if (data.top_shifts) candidates = data.top_shifts;
                else if (Array.isArray(data)) candidates = data;

                if (candidates.length > 0) {
                    console.log(`Found ${candidates.length} candidates in a report. Saving...`);
                    for (const item of candidates) {
                        const url = item.sources?.[0]?.url || item.brief?.url || item.url || "https://example.com/missing-source";
                        const title = item.title || item.shift || item.headline || "Untitled Scout Link";
                        const summary = item.event_summary || item.why_it_matters || item.brief?.summary || item.brief?.headline;

                        await client.mutation("links:addLink", {
                            url: url,
                            title: title,
                            summary: summary,
                            agent: task.assignedTo || "Manual Recovery",
                            taskId: task._id,
                            tags: [item.bucket_id || "general", ...(item.tags || [])],
                            qualityScore: item.feature_score || 7
                        });
                        console.log(`Saved: ${title}`);
                        savedCount++;
                    }
                }
            } catch (e) {
                // Skip faulty JSON
            }
        }
        console.log(`Done! Total saved: ${savedCount}`);
    } catch (e) {
        console.error("Failed to reprocess:", e.message);
    }
}

// Target the Curie task
reprocessTask("jh72skjshvpm0t1resr701nenn80q8j8");
