
import { api } from "./convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkLastTask() {
    const tasks = await client.query(api.tasks.list);
    // Sort by creation time if possible, or just find the one with my title
    const myTask = tasks.find(t => t.title.includes("Find AI news released specifically"));

    if (myTask) {
        console.log("Found Task:");
        console.log(JSON.stringify(myTask, null, 2));
    } else {
        console.log("Task not found!");
    }
}

checkLastTask();
