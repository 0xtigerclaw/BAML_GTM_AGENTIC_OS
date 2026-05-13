import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🗑️ Clearing ALL tasks...");

    const tasks = await client.query(api.tasks.list);
    console.log(`Found ${tasks.length} tasks to delete.`);

    for (const task of tasks) {
        // We need a delete mutation. `clearDone` uses `ctx.db.delete`.
        // I don't have a generic `delete` mutation exposed.
        // I'll check if there is one. 
        // If not, I'll add a temporary one or iterate if I can.
        // Actually best way: Add a `reset` mutation to `convex/tasks.ts`.
    }
}
// Wait, I can't delete from client without a mutation.
// I will create a `resetAll` mutation in `convex/tasks.ts` first.
