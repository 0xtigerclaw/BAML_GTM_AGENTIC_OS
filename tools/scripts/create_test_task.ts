
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function createTestTask() {
    const taskId = await client.mutation(api.tasks.create, {
        title: "Ive, please generate a futuristic city image for our blog",
        priority: "high"
    });
    console.log(`Created test task: ${taskId}`);
}

createTestTask();
