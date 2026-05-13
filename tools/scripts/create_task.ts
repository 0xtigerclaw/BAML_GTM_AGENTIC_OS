
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function createTask() {
    console.log("Creating test task...");
    await client.mutation(api.tasks.create, {
        title: "generate an image for lion in masai mara",
        priority: "medium"
    });
    console.log("Task created!");
}

createTask();
