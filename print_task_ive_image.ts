import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const taskId = process.argv[2];
if (!taskId) {
  console.error("Usage: npx tsx print_task_ive_image.ts <taskId>");
  process.exit(2);
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(2);
}

const client = new ConvexHttpClient(convexUrl);

async function main() {
  const task = (await client.query(api.tasks.get, { id: taskId })) as unknown as {
    outputs?: Array<{ agent: string; content: string }>;
  };
  const ive = (task?.outputs ?? []).find((o) => o.agent === "Ive");
  const match = typeof ive?.content === "string"
    ? ive.content.match(/!\[Design Mockup\]\((.*?)\)/)
    : null;
  console.log(match?.[1] || "");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
