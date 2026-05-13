import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("Fetching recent Porter tasks...");
    const tasks = await client.query(api.tasks.list, {});
    const porterTasks = tasks
        .filter((t: any) => t.workflow?.includes("Porter"))
        .slice(-3);

    console.log(JSON.stringify(porterTasks, null, 2));
}

main();
