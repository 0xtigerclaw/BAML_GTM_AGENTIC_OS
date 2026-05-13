import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const taskId = process.argv[2];
if (!taskId) {
  console.error("Usage: npx tsx monitor_task.ts <taskId>");
  process.exit(2);
}

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(2);
}

const client = new ConvexHttpClient(convexUrl);

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  let lastOutputs = -1;
  for (let i = 0; i < 120; i++) {
    const task = (await client.query(api.tasks.get, { id: taskId })) as unknown as {
      status?: string;
      assignedTo?: string | string[];
      outputs?: Array<{ title: string; agent: string }>;
    };
    const outputs = task?.outputs ?? [];
    if (outputs.length !== lastOutputs) {
      lastOutputs = outputs.length;
      console.log(
        JSON.stringify(
          {
            id: taskId,
            status: task?.status,
            assignedTo: task?.assignedTo,
            outputs: outputs.map((o) => ({ title: o.title, agent: o.agent })),
          },
          null,
          2,
        ),
      );
    }
    if (task?.status === "done") return;
    await sleep(3000);
  }
  console.error("Timed out waiting for task to complete.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
