import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
    console.error("NEXT_PUBLIC_CONVEX_URL is not set");
    process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

async function debugRag(queryText: string) {
    console.log(`\n🔍 Searching RAG for: "${queryText}"...`);
    try {
        const results = await client.action(api.knowledge.searchKnowledge, {
            query: queryText,
            limit: 5
        });

        if (results.length === 0) {
            console.log("❌ No results found in RAG.");
            return;
        }

        console.log(`✅ Found ${results.length} chunks:\n`);
        results.forEach((res: any, i: number) => {
            console.log(`--- Chunk ${i + 1} (${res.section} from ${res.documentName}) ---`);
            console.log(`Score: ${res._score}`);
            console.log(res.content);
            console.log("");
        });
    } catch (err) {
        console.error("Error searching RAG:", err);
    }
}

const query = process.argv[2] || "WHAT ARE YOU WORKING ON?";
debugRag(query).then(() => process.exit(0));
