
import { api } from "./convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function trigger() {
    const uniqueQuery = `Find AI news released specifically on or after timestamp ${Date.now()} (run 2)`;
    console.log(`Triggering Scout with: "${uniqueQuery}"`);

    // Use api.tasks.create mutation with workflow to assign to Curie
    await client.mutation(api.tasks.create, {
        title: uniqueQuery,
        description: "Use web_search to find 3 brand new links.",
        priority: "high",
        workflow: ["Curie"],
    });
    console.log("Task created.");
}

trigger();
