import { readFileSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

dotenv.config({ path: ".env.local" });

type RssSourceRow = {
  _id: Id<"rss_sources">;
  name: string;
  category: string;
  url: string;
  originalUrl?: string | null;
  active?: boolean;
};

type ProxyCandidate = {
  lab: string;
  origin: string;
  status: string;
  proxyUrl: string;
  itemCount: number;
};

function requireConvexUrlFromEnv(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL (expected in .env.local).");
  }
  return convexUrl;
}

function parseProxyViabilityTsv(path: string): ProxyCandidate[] {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: ProxyCandidate[] = [];

  for (const line of lines) {
    const [lab = "", origin = "", status = "", proxyUrl = "", itemCountRaw = "0"] = line.split("\t");
    const itemCount = Number(itemCountRaw || 0);
    rows.push({
      lab,
      origin,
      status,
      proxyUrl,
      itemCount: Number.isFinite(itemCount) ? itemCount : 0,
    });
  }

  return rows;
}

function isFeedfryUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("feedfry.com");
  } catch {
    return false;
  }
}

async function main() {
  const convexUrl = requireConvexUrlFromEnv();
  const client = new ConvexHttpClient(convexUrl);
  const viabilityPath = process.env.NEOLABS_PROXY_VIABILITY_FILE || ".run/neolabs_proxy_viability_curl.tsv";
  const candidates = parseProxyViabilityTsv(viabilityPath)
    .filter((row) => row.status === "proxy-ok")
    .filter((row) => row.itemCount > 0)
    .filter((row) => row.proxyUrl.startsWith("https://feedfry.com/rss/"));

  const existing = (await client.query(api.rss.list, {})) as RssSourceRow[];

  let added = 0;
  let reactivated = 0;
  let skippedHasOfficial = 0;
  let skippedConflict = 0;
  let skippedInvalid = 0;

  const events: string[] = [];

  for (const candidate of candidates) {
    if (!candidate.lab || !candidate.proxyUrl || !candidate.origin) {
      skippedInvalid += 1;
      events.push(`Invalid row: ${candidate.lab || "(unknown)"}`);
      continue;
    }

    const sameLabNeo = existing.filter((row) => row.category === "NeoLabs" && row.name === candidate.lab);
    const hasOfficial = sameLabNeo.some((row) => !isFeedfryUrl(row.url));
    if (hasOfficial) {
      skippedHasOfficial += 1;
      events.push(`Skip (official exists): ${candidate.lab}`);
      continue;
    }

    const sameProxy = existing.find((row) => row.url === candidate.proxyUrl);
    if (sameProxy) {
      if (sameProxy.category === "NeoLabs" && sameProxy.name === candidate.lab) {
        if (!sameProxy.active) {
          await client.mutation(api.rss.update, {
            id: sameProxy._id,
            active: true,
            category: "NeoLabs",
            name: candidate.lab,
          });
          reactivated += 1;
          events.push(`Reactivated: ${candidate.lab} -> ${candidate.proxyUrl}`);
        } else {
          events.push(`Keep existing: ${candidate.lab} -> ${candidate.proxyUrl}`);
        }
        continue;
      }

      skippedConflict += 1;
      events.push(`Skip (URL conflict): ${candidate.lab} -> ${candidate.proxyUrl}`);
      continue;
    }

    await client.mutation(api.rss.add, {
      name: candidate.lab,
      url: candidate.proxyUrl,
      category: "NeoLabs",
    });
    added += 1;
    events.push(`Added proxy: ${candidate.lab} -> ${candidate.proxyUrl}`);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    viabilityFile: viabilityPath,
    candidates: candidates.length,
    added,
    reactivated,
    skippedHasOfficial,
    skippedConflict,
    skippedInvalid,
    unchanged: candidates.length - added - reactivated - skippedHasOfficial - skippedConflict - skippedInvalid,
  };

  writeFileSync(".run/neolabs_proxy_import_latest.json", JSON.stringify({ summary, events }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
