
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function count() {
    const tasks = await client.query(api.tasks.list);
    console.log(`Total Tasks: ${tasks.length}`);
    const byStatus = tasks.reduce((acc: any, t: any) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {});
    console.log(byStatus);
}

count();
