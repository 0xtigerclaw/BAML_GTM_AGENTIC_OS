import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type ScoutedLink = {
  _id: Id<"scouted_links">;
  url: string;
  title?: string;
  status: string;
  createdAt: number;
};

type CliFilters = {
  status: string;
  hostContains?: string;
  urlContains?: string;
  titleContains?: string;
  olderThanDays?: number;
  execute: boolean;
  confirmToken?: string;
};

function parseArgs(argv: string[]): CliFilters {
  const filters: CliFilters = {
    status: "pending",
    execute: false,
  };

  for (const arg of argv) {
    if (arg === "--execute") {
      filters.execute = true;
      continue;
    }
    if (arg.startsWith("--confirm=")) {
      filters.confirmToken = arg.slice("--confirm=".length).trim();
      continue;
    }
    if (arg.startsWith("--status=")) {
      filters.status = arg.slice("--status=".length).trim();
      continue;
    }
    if (arg.startsWith("--host-contains=")) {
      filters.hostContains = arg.slice("--host-contains=".length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith("--url-contains=")) {
      filters.urlContains = arg.slice("--url-contains=".length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith("--title-contains=")) {
      filters.titleContains = arg.slice("--title-contains=".length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith("--older-than-days=")) {
      const raw = arg.slice("--older-than-days=".length).trim();
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --older-than-days value: ${raw}`);
      }
      filters.olderThanDays = parsed;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return filters;
}

function matches(link: ScoutedLink, filters: CliFilters): boolean {
  if (filters.hostContains) {
    try {
      const host = new URL(link.url).hostname.toLowerCase();
      if (!host.includes(filters.hostContains)) return false;
    } catch {
      return false;
    }
  }

  if (filters.urlContains && !link.url.toLowerCase().includes(filters.urlContains)) return false;
  if (filters.titleContains && !(link.title || "").toLowerCase().includes(filters.titleContains)) return false;
  if (filters.olderThanDays) {
    const cutoff = Date.now() - filters.olderThanDays * 24 * 60 * 60 * 1000;
    if (link.createdAt >= cutoff) return false;
  }

  return true;
}

async function main() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");

  const filters = parseArgs(process.argv.slice(2));
  const client = new ConvexHttpClient(convexUrl);
  const allForStatus = (await client.query(api.links.listByStatus, {
    status: filters.status,
  })) as ScoutedLink[];

  const hasAnyFilter =
    Boolean(filters.hostContains) ||
    Boolean(filters.urlContains) ||
    Boolean(filters.titleContains) ||
    Boolean(filters.olderThanDays);
  if (!hasAnyFilter) {
    throw new Error("Refusing unfiltered destructive run. Add at least one filtering flag.");
  }

  const candidates = allForStatus.filter((link) => matches(link, filters));

  console.log(
    JSON.stringify(
      {
        mode: filters.execute ? "execute" : "dry-run",
        filters,
        totalInStatus: allForStatus.length,
        matched: candidates.length,
        sample: candidates.slice(0, 20).map((row) => ({
          id: row._id,
          status: row.status,
          createdAt: row.createdAt,
          title: row.title,
          url: row.url,
        })),
      },
      null,
      2,
    ),
  );

  if (!filters.execute || candidates.length === 0) return;
  if (filters.confirmToken !== "IGNORE_SCOUTED_LINKS") {
    throw new Error("Missing confirmation token. Re-run with --confirm=IGNORE_SCOUTED_LINKS");
  }

  for (const link of candidates) {
    await client.mutation(api.links.reviewLink, {
      id: link._id,
      status: "ignored",
      feedback: "Ignored by destructive maintenance script",
    });
  }

  console.log(`Ignored ${candidates.length} scouted_links rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
