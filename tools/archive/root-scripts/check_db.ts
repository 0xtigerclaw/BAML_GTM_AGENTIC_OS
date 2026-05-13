
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkTasks() {
    const tasks = await client.query(api.tasks.list);
    // Find done tasks that might be related to Wanda
    const wandaRelated = tasks.filter(t =>
        t.status === "done" && (
            (t.workflow && t.workflow.includes("Ive")) ||
            t.title.toLowerCase().includes("ive") ||
            t.title.toLowerCase().includes("image") ||
            t.title.toLowerCase().includes("design")
        )
    );

    console.log(`Found ${wandaRelated.length} related "done" tasks.`);

    wandaRelated.forEach(t => {
        console.log(`\n--- Task: ${t.title} ---`);
        console.log(`Assigned To: ${t.assignedTo}`);
        console.log("Output snippet:");
        console.log(t.output ? t.output.substring(t.output.length - 500) : "NO OUTPUT");
        console.log("Has image markdown?", t.output?.includes("![Design Mockup]"));
    });
}

checkTasks();
