import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function debugGraph(queryText: string) {
    console.log(`\n🔍 Searching GraphRAG for: "${queryText}"...`);
    try {
        const result = await client.action(api.graph.queryKnowledgeGraph, {
            query: queryText,
            depth: 1
        });

        if (!result) {
            console.log("❌ No results found in GraphRAG.");
            return;
        }

        console.log(`✅ Graph Result:\n`);
        console.log(result);
    } catch (err) {
        console.error("Error searching GraphRAG:", err);
    }
}

const query = process.argv[2] || "WHAT ARE YOU WORKING ON?";
debugGraph(query).then(() => process.exit(0));
