import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function main() {
    console.log("🔥 Invoking `reset` mutation to wipe ALL tasks & messages...");
    try {
        await client.mutation(api.tasks.reset, {});
        console.log("✅ Done. The board is clean.");
    } catch (e: any) {
        console.error("❌ Failed:", e.message);
    }
}

main();
