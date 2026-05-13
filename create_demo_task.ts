
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("Creating Demo Video Task...");
    await client.mutation(api.tasks.create, {
        title: "Nolan, create a 10s demo video for Mission Control",
        description: "Showcase the features: 1. AI Agents, 2. Seamless Handoffs, 3. Video Production. Use a modern, dark theme.",
        priority: "normal"
    });
    console.log("Task created!");
}

main();
