import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function triggerTestMission() {
    console.log("Triggering test mission...");
    const taskId = await client.mutation(api.tasks.create, {
        title: "Test Mission for Tabs: Explain Quantum Computing",
        description: "Write a short explaination of Quantum Computing for a 5 year old.",
        workflow: ["Ogilvy", "Carnegie", "Ive"]
    });

    // Assign workflow manually if create doesn't do it (it should if logic is there, but let's be safe)
    // Actually create -> analyze -> workflow.
    // Let's just monitor it.
    console.log(`Mission started: ${taskId}`);
}

triggerTestMission();
