import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

dotenv.config({ path: ".env.local" });

async function main() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  }

  const csvPath = process.argv[2] || "/Users/swayam/Downloads/linkedin_posts_last40days_all.csv";
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const client = new ConvexHttpClient(convexUrl);

  console.log(`Importing LinkedIn analytics from: ${csvPath}`);
  const importResult = await client.action(api.linkedinAnalyticsActions.importCsv, {
    csvContent: content,
    sourceFile: path.basename(csvPath),
  });

  console.log("Import result:", importResult);

  const summary = await client.query(api.linkedinAnalytics.getSummary, {});
  console.log("Summary:", summary);

  const top = await client.query(api.linkedinAnalytics.listTopPosts, {
    metric: "engagement_rate",
    limit: 5,
    minImpressions: 300,
  });
  console.log("Top posts by engagement rate (min 300 impressions):");
  for (const row of top) {
    const ratePct = (row.engagementRate * 100).toFixed(2);
    console.log(`- ${ratePct}% | ${row.impressions} imp | ${row.hookLine}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
