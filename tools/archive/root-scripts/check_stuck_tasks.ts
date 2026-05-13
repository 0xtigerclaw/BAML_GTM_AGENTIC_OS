
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkTasks() {
    const tasks = await client.query(api.tasks.list);
    console.log("--- Current Tasks ---");
    tasks.forEach(t => {
        console.log(`[${t.status.toUpperCase()}] ${t.title} (Assigned to: ${t.assignedTo})`);
        if (t.status === 'assigned') {
            console.log(`   -> Potential Stuck Task. ID: ${t._id}`);
        }
    });
}

checkTasks();
