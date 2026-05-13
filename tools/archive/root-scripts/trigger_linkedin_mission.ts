import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function triggerLinkedInMission() {
  const taskId = await client.mutation(api.tasks.create, {
    title: "LinkedIn Post: Fresh intel -> signal",
    description:
      "Write a LinkedIn post about why filtering RSS intel to the last 48 hours improves signal-to-noise for builders. End with a question. Then create the branded overlay image using the template.",
    workflow: ["Ogilvy", "Carnegie", "Ive"],
  });
  console.log(`✅ LinkedIn mission started: ${taskId}`);
}

triggerLinkedInMission().catch((err) => {
  console.error(err);
  process.exit(1);
});

