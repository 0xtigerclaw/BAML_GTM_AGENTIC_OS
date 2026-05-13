import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function wakeTigerclaw() {
    console.log("Waking Tigerclaw...");
    const agents = await client.query(api.agents.list);
    const tiger = agents.find(a => a.name === "Tigerclaw");

    if (tiger) {
        console.log(`Found Tigerclaw: ${tiger._id}, Status: ${tiger.status}`);
        await client.mutation(api.agents.updateStatus, {
            id: tiger._id,
            status: "idle" // 'idle' agents are usually picked up by gateway main loop to look for work
        });
        console.log("Tigerclaw set to idle.");
    } else {
        console.log("Tigerclaw not found!");
    }
}

wakeTigerclaw();
