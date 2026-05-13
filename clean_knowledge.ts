import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function cleanKnowledgeBase() {
    console.log("📥 Fetching all knowledge chunks...");
    const allChunks = await client.query(api.knowledge.getAllKnowledge);
    console.log(`Found ${allChunks.length} total chunks.`);

    const seenContent = new Set<string>();
    const toDelete = [];
    const remaining = [];

    for (const chunk of allChunks) {
        const content = chunk.content;
        const normalized = content.trim().toLowerCase();

        // Check if it's the "whale" one
        if (normalized.includes("whale")) {
            console.log(`🚫 Marking for deletion (WHALE): ${chunk.section}`);
            toDelete.push(chunk._id);
            continue;
        }

        // Check for duplicates
        if (seenContent.has(normalized)) {
            console.log(`🚫 Marking for deletion (DUPLICATE): ${chunk.section}`);
            toDelete.push(chunk._id);
        } else {
            seenContent.add(normalized);
            remaining.push(chunk);
        }
    }

    console.log(`\n🧹 Deleting ${toDelete.length} chunks...`);
    for (const id of toDelete) {
        await client.mutation(api.knowledge.deleteChunk, { id });
    }

    console.log(`\n✅ Clean complete. ${remaining.length} chunks remaining.`);

    // Build the Knowledge Base file
    let mdContent = "# SoraChain Knowledge Base\n\n";
    mdContent += `*Last Updated: ${new Date().toLocaleString()}*\n\n`;

    for (const chunk of remaining) {
        mdContent += `## ${chunk.section}\n`;
        mdContent += `**Document:** ${chunk.documentName}\n`;
        mdContent += `**Source:** ${chunk.metadata?.source || "unknown"}\n\n`;
        mdContent += `${chunk.content}\n\n`;
        mdContent += "---\n\n";
    }

    fs.writeFileSync("knowledge_base.md", mdContent);
    console.log("📄 Saved remaining knowledge to knowledge_base.md");
}

cleanKnowledgeBase().then(() => process.exit(0));
