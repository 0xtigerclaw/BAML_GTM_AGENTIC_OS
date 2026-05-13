
import { api } from "./convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("Fetching tasks...");
    const tasks = await client.query(api.tasks.list);
    const doneTask = tasks.find(t => t.status === "done");

    if (doneTask) {
        console.log("Found Done Task:", doneTask.title);
        console.log("Outputs:", JSON.stringify(doneTask.outputs, null, 2));
    } else {
        console.log("No done task found.");
    }
}

main().catch(console.error);
