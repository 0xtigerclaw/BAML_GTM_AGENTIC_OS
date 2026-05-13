import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
const { PDFParse } = require("pdf-parse");

dotenv.config({ path: ".env.local" });

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const client = new ConvexHttpClient(convexUrl);

const BASE_DIR = "/Users/swayam/clawd/SoraChain AI/SoraChain AI";

const TIER1_FILES = [
  "SoraChain AI.md",
  "SoraChain AI_Pitch Deck.pdf",
  "Sample Application for SoraChain AI.pdf",
  "Incentive Flow across SoraChain AI 2032643270a9809eb6c5d8d8848b45e6.md",
  "Interoperability 2022643270a980d5b908c3ec0915cf8d.md",
  "Third-party Validation Models 2022643270a980a89994e54f7c0cfe13.md",
  "Hashing On-Chain for SoraChain AI 2022643270a98024b413d47bf65c9af0.md",
] as const;

function cleanText(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkByHeading(md: string, maxChars = 1600, overlapChars = 220): Array<{ section: string; content: string }> {
  const normalized = cleanText(md);
  const lines = normalized.split("\n");

  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = "Overview";
  let buffer: string[] = [];

  const flush = () => {
    const body = cleanText(buffer.join("\n"));
    if (body.length > 120) sections.push({ title: currentTitle, body });
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  const out: Array<{ section: string; content: string }> = [];

  for (const s of sections) {
    const text = s.body;
    if (text.length <= maxChars) {
      out.push({ section: s.title, content: text });
      continue;
    }

    let start = 0;
    let chunkIndex = 1;
    while (start < text.length) {
      const end = Math.min(start + maxChars, text.length);
      const slice = text.slice(start, end);
      const chunkTitle = `${s.title} (part ${chunkIndex})`;
      out.push({ section: chunkTitle, content: slice.trim() });
      if (end >= text.length) break;
      start = Math.max(0, end - overlapChars);
      chunkIndex += 1;
    }
  }

  return out;
}

function keepSectionForDoc(documentName: string, section: { section: string; content: string }): boolean {
  if (section.content.length < 140) return false;

  const title = section.section.toLowerCase();
  const body = section.content.toLowerCase();
  const combined = `${title} ${body}`;

  if (documentName === "SoraChain AI.md") {
    const excludeSignals = [
      "quick connect",
      "important links",
      "belief system",
      "design principles",
      "value creation",
      "ecosystem",
      "appendix",
      "vision & product",
      "gtm",
      "risk assessment",
      "relentless shipping",
      "irrational optimism",
      "inclusive by design",
      "tokenomics",
      "market validation for fl",
      "analysis across all relevant competitors",
      "flower (agnostic",
      "nvflare (nvidia",
    ];
    if (excludeSignals.some((x) => combined.includes(x))) return false;

    const includeSignals = [
      "executive overview",
      "what is sorachain",
      "problem",
      "hypothesis",
      "why sorachain ai must exist",
      "core innovation",
      "differentiat",
      "team",
      "co-founder",
      "market",
      "traction",
      "roadmap",
      "federated learning workflow",
      "blockchain layer",
      "trust",
      "security",
      "subnet",
      "interoperability",
      "incentive",
      "revenue",
      "pricing",
      "monetization",
      "validation",
      "use case",
    ];
    return includeSignals.some((x) => combined.includes(x));
  }

  return true;
}

async function extractSections(filePath: string): Promise<Array<{ section: string; content: string }>> {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  if (ext === ".md") {
    const raw = fs.readFileSync(filePath, "utf-8");
    return chunkByHeading(raw);
  }

  if (ext === ".pdf") {
    const data = fs.readFileSync(filePath);
    const parser = new PDFParse({ data });
    const parsed = await parser.getText();
    const text = cleanText(parsed?.text || "");
    await parser.destroy();
    // Convert PDF text to pseudo-markdown for chunking
    const pseudoMd = `# ${fileName}\n\n${text}`;
    return chunkByHeading(pseudoMd, 1800, 260);
  }

  return [];
}

async function main() {
  console.log("🧹 Clearing existing knowledge + graph...");
  const kbResult = await client.mutation(api.cleanup.clearKnowledgeBase, {});
  const graphResult = await client.mutation(api.cleanup.clearKnowledgeGraph, {});
  console.log("Knowledge clear:", kbResult);
  console.log("Graph clear:", graphResult);

  console.log("\n📥 Ingesting curated Tier 1 corpus...");
  let totalChunks = 0;

  for (const rel of TIER1_FILES) {
    const fullPath = path.join(BASE_DIR, rel);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Missing file, skipping: ${fullPath}`);
      continue;
    }

    const sections = await extractSections(fullPath);
    const filtered = sections.filter((s) => keepSectionForDoc(rel, s));
    if (filtered.length === 0) {
      console.warn(`⚠️ No sections extracted: ${rel}`);
      continue;
    }

    console.log(`\n- ${rel}: ${filtered.length}/${sections.length} sections kept`);

    const result = await client.action(api.knowledge.ingestDocument, {
      documentName: rel,
      sections: filtered,
      metadata: {
        source: "curated_tier1",
        version: "2026-02-10",
        audienceTags: ["form_filler", "tier1", "core_truth"],
      },
    });

    totalChunks += result.chunksStored || 0;
    console.log(`  ✅ Stored ${result.chunksStored} chunks`);
  }

  const allKnowledge = await client.query(api.knowledge.getAllKnowledge, {});
  const grouped = [...allKnowledge].sort((a, b) => a.section.localeCompare(b.section));

  let md = "# SoraChain Knowledge Base (Curated)\n\n";
  md += `*Regenerated: ${new Date().toISOString()}*\n\n`;
  for (const chunk of grouped) {
    md += `## ${chunk.section}\n`;
    md += `**Document:** ${chunk.documentName}\n`;
    md += `**Source:** ${chunk.metadata?.source || "unknown"}\n\n`;
    md += `${chunk.content}\n\n---\n\n`;
  }

  fs.writeFileSync(path.join(process.cwd(), "knowledge_base.md"), md);

  console.log("\n🧠 Rebuilding GraphRAG from fresh knowledge_base.md...");
  const { spawnSync } = await import("child_process");
  const graphBuild = spawnSync("npx", ["tsx", "populate_graph.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (graphBuild.status !== 0) {
    throw new Error(`Graph rebuild failed with exit code ${graphBuild.status}`);
  }

  const count = await client.query(api.knowledge.getKnowledgeCount, {});
  console.log("\n✅ Re-ingestion complete");
  console.log(`Knowledge chunks: ${count.count}`);
  console.log(`Total chunks ingested this run: ${totalChunks}`);
}

main().catch((err) => {
  console.error("❌ Re-ingestion failed:", err);
  process.exit(1);
});
