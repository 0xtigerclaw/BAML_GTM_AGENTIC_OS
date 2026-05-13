import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");

const client = new ConvexHttpClient(convexUrl);

async function main() {
  const taskId = await client.mutation(api.tasks.create, {
    title: "Draft Content: Google launches Developer Knowledge API MCP server",
    description: `Write a LinkedIn post summarizing this announcement.

SOURCE MATERIAL:
- **Data Commons MCP becomes hosted service**
  URL: https://api.datacommons.org/mcp
  Date: 2026-02-09

- **Roblox accelerates creation with Cube foundation model**
  URL: https://about.roblox.com/newsroom/2026/02/accelerating-creation-powered-roblox-cube-foundation-model
  Date: 2026-02-09
`,
    workflow: ["Ogilvy", "Carnegie", "Ive"],
  });

  console.log(taskId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

