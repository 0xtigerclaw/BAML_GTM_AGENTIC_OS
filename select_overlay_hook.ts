import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const taskId = process.argv[2];
if (!taskId) {
  console.error("Usage: npx tsx select_overlay_hook.ts <taskId> [hook]");
  process.exit(2);
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");

const client = new ConvexHttpClient(convexUrl);

async function main() {
  const task = (await client.query(api.tasks.get, { id: taskId })) as unknown as {
    overlayHookCandidates?: string[];
  };
  const candidates = task?.overlayHookCandidates ?? [];
  const hook = (process.argv[3] || candidates[0] || "").trim();
  if (!hook) throw new Error("No hook provided and no candidates found.");

  await client.mutation(api.tasks.selectOverlayHook, { id: taskId, hook });
  console.log(`✅ Selected hook for ${taskId}: ${hook}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
