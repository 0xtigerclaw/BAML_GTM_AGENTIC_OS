
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkTaskById(id: string) {
    console.log(`Searching for task ID: ${id}...`);
    const tasks = await client.query(api.tasks.list);
    const target = tasks.find(t => t._id === id);

    if (target) {
        console.log(`\n--- FOUND TASK ---`);
        console.log(`ID: ${target._id}`);
        console.log(`Title: ${target.title}`);
        console.log(`Status: ${target.status}`);
        console.log(`Assigned To: ${target.assignedTo}`);

        console.log("\n--- OUTPUTS ---");
        if (target.outputs && target.outputs.length > 0) {
            target.outputs.forEach((o: any, i: number) => {
                console.log(`[${i}] ${o.title}: ${o.content.slice(0, 300)}...`);
            });
            const last = target.outputs[target.outputs.length - 1];
            // Log full last output if it's not too huge, or a chunk
            console.log(`\nLAST OUTPUTSnippet:\n${last.content.slice(0, 1000)}`);
        } else {
            console.log("No outputs found.");
            console.log(`Legacy Output: ${target.output}`);
        }
    } else {
        console.log(`Could not find task with ID ${id}`);
    }
}

const id = process.argv[2];
if (!id) {
    console.log("Please provide an ID");
} else {
    checkTaskById(id);
}
