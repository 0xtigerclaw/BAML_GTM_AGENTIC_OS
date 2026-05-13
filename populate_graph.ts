import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function extractAndPopulate() {
    console.log("📖 Reading knowledge_base.md...");
    const content = fs.readFileSync("knowledge_base.md", "utf-8");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is not set");
        process.exit(1);
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
Extract a Knowledge Graph from the following text.
Output ONLY a JSON object with "nodes" and "edges".

Nodes should have: "label", "type" (Person, Organization, Technology, Metric, Event, Product), "description".
Edges should have: "fromLabel", "toLabel", "relationship", "description".

Text:
${content}
`;

    const result_raw = await model.generateContent(prompt);
    const result = JSON.parse(result_raw.response.text());

    console.log(`✅ Extracted ${result.nodes.length} nodes and ${result.edges.length} edges.`);

    // 1. Process Nodes
    for (const node of result.nodes) {
        process.stdout.write(`🔹 Upserting Node: ${node.label}... `);
        await client.action(api.graph.upsertNode, node);
        console.log("Done.");
    }

    // 2. Process Edges
    for (const edge of result.edges) {
        process.stdout.write(`🔗 Adding Edge: ${edge.fromLabel} --[${edge.relationship}]--> ${edge.toLabel}... `);
        try {
            await client.mutation(api.graph.addEdge, edge);
            console.log("Done.");
        } catch (err) {
            console.log("Failed (Node likely missing).");
        }
    }

    console.log("\n🚀 GraphRAG population complete.");
}

extractAndPopulate().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
