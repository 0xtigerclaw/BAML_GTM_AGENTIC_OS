
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function migrate() {
    console.log("Migrating agents...");
    // @ts-expect-error Convex mutation typing expects args, but this mutation has none.
    await client.mutation(api.agents.resetSquad);
    console.log("Agents reset to new roster!");
}

migrate();
