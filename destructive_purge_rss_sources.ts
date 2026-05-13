import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import type { Id } from "./convex/_generated/dataModel";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type RssSource = {
  _id: Id<"rss_sources">;
  name: string;
  url: string;
  category: string;
  active: boolean;
};

type CliFilters = {
  category?: string;
  hostContains?: string;
  nameContains?: string;
  inactiveOnly?: boolean;
  allowAll?: boolean;
  execute: boolean;
  confirmToken?: string;
};

function parseArgs(argv: string[]): CliFilters {
  const filters: CliFilters = { execute: false };
  for (const arg of argv) {
    if (arg === "--execute") {
      filters.execute = true;
      continue;
    }
    if (arg === "--allow-all") {
      filters.allowAll = true;
      continue;
    }
    if (arg === "--inactive-only") {
      filters.inactiveOnly = true;
      continue;
    }
    if (arg.startsWith("--confirm=")) {
      filters.confirmToken = arg.slice("--confirm=".length).trim();
      continue;
    }
    if (arg.startsWith("--category=")) {
      filters.category = arg.slice("--category=".length).trim();
      continue;
    }
    if (arg.startsWith("--host-contains=")) {
      filters.hostContains = arg.slice("--host-contains=".length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith("--name-contains=")) {
      filters.nameContains = arg.slice("--name-contains=".length).trim().toLowerCase();
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return filters;
}

function matches(source: RssSource, filters: CliFilters): boolean {
  if (filters.category && source.category !== filters.category) return false;
  if (filters.inactiveOnly && source.active) return false;
  if (filters.nameContains && !source.name.toLowerCase().includes(filters.nameContains)) return false;
  if (filters.hostContains) {
    try {
      const host = new URL(source.url).hostname.toLowerCase();
      if (!host.includes(filters.hostContains)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function main() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");

  const filters = parseArgs(process.argv.slice(2));
  const client = new ConvexHttpClient(convexUrl);
  const all = (await client.query(api.rss.list, {})) as RssSource[];
  const hasAnyFilter =
    Boolean(filters.category) ||
    Boolean(filters.hostContains) ||
    Boolean(filters.nameContains) ||
    Boolean(filters.inactiveOnly);

  if (!hasAnyFilter && !filters.allowAll) {
    throw new Error(
      "Refusing unfiltered destructive run. Add at least one filter or pass --allow-all explicitly.",
    );
  }

  const candidates = all.filter((source) => matches(source, filters));

  console.log(
    JSON.stringify(
      {
        mode: filters.execute ? "execute" : "dry-run",
        filters,
        totalSources: all.length,
        matched: candidates.length,
        sample: candidates.slice(0, 20).map((row) => ({
          id: row._id,
          name: row.name,
          category: row.category,
          active: row.active,
          url: row.url,
        })),
      },
      null,
      2,
    ),
  );

  if (!filters.execute || candidates.length === 0) return;
  if (filters.confirmToken !== "DELETE_RSS_SOURCES") {
    throw new Error("Missing confirmation token. Re-run with --confirm=DELETE_RSS_SOURCES");
  }

  for (const source of candidates) {
    await client.mutation(api.rss.remove, { id: source._id });
  }

  console.log(`Deleted ${candidates.length} rss_sources rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
