
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkLatest() {
    console.log("Fetching latest done task...");
    const tasks = await client.query(api.tasks.list);
    const doneTasks = tasks.filter(t => t.status === "done").sort((a, b) => b.chatHistory?.length - a.chatHistory?.length);
    // Sort by modification or just pick the one with "design" in title/feedback?

    // Actually, let's find the one with feedback "design cover 2"
    const target = tasks.find(t =>
        (t.title && t.title.includes("blog")) &&
        (t.feedback && t.feedback.includes("design"))
    );

    if (target) {
        console.log(`Found Task: ${target.title}`);
        console.log(`Feedback: ${target.feedback}`);
        console.log(`Outputs: ${target.outputs?.length}`);
        if (target.outputs && target.outputs.length > 0) {
            const lastOutput = target.outputs[target.outputs.length - 1];
            console.log(`Last Output Title: ${lastOutput.title}`);
            console.log(`Last Output Content Length: ${lastOutput.content.length}`);
            console.log(`Contains Image Link? ${lastOutput.content.includes("![") || lastOutput.content.includes(".png")}`);
            console.log(`Content Snippet (End): ${lastOutput.content.slice(-300)}`);
        } else {
            console.log("No outputs array.");
            console.log(`Legacy Output: ${target.output?.slice(-100)}`);
        }
    } else {
        console.log("Could not find specific design task. Listing latest done:");
        if (doneTasks.length > 0) {
            const t = doneTasks[0]; // Wait, list returns all?
            // Convex list order is creation time? 
            console.log(`Latest ID: ${t._id}, Title: ${t.title}`);
            console.log(`Feedback: "${t.feedback}"`);
            console.log(`Outputs: ${t.outputs?.length}`);
            if (t.outputs && t.outputs.length > 0) {
                t.outputs.forEach((o, i) => console.log(`Output [${i}] Title: "${o.title}" ContentLen: ${o.content.length}`));
                console.log(`Last Output: \n${t.outputs[t.outputs.length - 1].content.slice(-500)}`);
            }
        }
    }
}

checkLatest();
