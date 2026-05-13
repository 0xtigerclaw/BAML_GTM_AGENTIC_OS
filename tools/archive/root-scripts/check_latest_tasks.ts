
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkLatest() {
    const tasks = await client.query(api.tasks.list);
    // Sort by creation time (descending) - assuming _creationTime exists or just taking end of list
    const sorted = tasks.sort((a, b) => b._creationTime - a._creationTime).slice(0, 5);

    console.log("--- Latest 5 Tasks ---");
    sorted.forEach(t => {
        console.log(`[${new Date(t._creationTime).toLocaleTimeString()}] "${t.title}"`);
        console.log(`   Status: ${t.status} | Assigned: ${t.assignedTo}`);
        if (t.outputs && t.outputs.length > 0) {
            console.log(`   Latest Output: ${t.outputs[t.outputs.length - 1].agent} - ${t.outputs[t.outputs.length - 1].title}`);
        }
        console.log("---");
    });
}

checkLatest();
