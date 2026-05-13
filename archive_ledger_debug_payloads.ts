import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import * as dotenv from "dotenv";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";

dotenv.config({ path: ".env.local" });

type ActivityLike = {
  agentName: string;
  type: string;
  content: string;
  timestamp: number;
};

type ArchiveState = {
  lastArchivedAtMs: number;
  lastTimestampFingerprints: string[];
};

type CliArgs = {
  limit: number;
  dryRun: boolean;
  outputDir: string;
  stateFile: string;
};

const LEDGER_MARKERS = [
  "[DEWEY_LEDGER_INPUT]",
  "[DEWEY_LEDGER_OUTPUT]",
  "[LEDGER_TASK_INPUT]",
  "[LEDGER_TASK_INPUT_MANUAL]",
];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    limit: 600,
    dryRun: false,
    outputDir: "memory/ledger_debug_archive",
    stateFile: "memory/ledger_debug_archive/state.json",
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --limit value: ${arg}`);
      args.limit = parsed;
      continue;
    }
    if (arg.startsWith("--output-dir=")) {
      args.outputDir = arg.slice("--output-dir=".length).trim();
      continue;
    }
    if (arg.startsWith("--state-file=")) {
      args.stateFile = arg.slice("--state-file=".length).trim();
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function fingerprint(event: ActivityLike): string {
  const base = `${event.timestamp}|${event.agentName}|${event.type}|${event.content}`;
  return createHash("sha1").update(base).digest("hex");
}

async function readState(stateFile: string): Promise<ArchiveState> {
  try {
    const raw = await readFile(stateFile, "utf8");
    const parsed = JSON.parse(raw) as ArchiveState;
    return {
      lastArchivedAtMs: Number.isFinite(parsed.lastArchivedAtMs) ? parsed.lastArchivedAtMs : 0,
      lastTimestampFingerprints: Array.isArray(parsed.lastTimestampFingerprints) ? parsed.lastTimestampFingerprints : [],
    };
  } catch {
    return { lastArchivedAtMs: 0, lastTimestampFingerprints: [] };
  }
}

function isLedgerDebugEvent(event: ActivityLike): boolean {
  return event.type === "debug" && LEDGER_MARKERS.some((marker) => event.content.includes(marker));
}

function shouldArchive(event: ActivityLike, state: ArchiveState, hash: string): boolean {
  if (event.timestamp < state.lastArchivedAtMs) return false;
  if (event.timestamp > state.lastArchivedAtMs) return true;
  return !state.lastTimestampFingerprints.includes(hash);
}

function toDayKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

async function appendJsonlLine(filePath: string, payload: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

async function main() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");

  const args = parseArgs(process.argv.slice(2));
  const client = new ConvexHttpClient(convexUrl);
  const state = await readState(args.stateFile);

  const events = (await client.query(api.agents.recentActivity, {
    limit: args.limit,
  })) as ActivityLike[];

  const filtered = events.filter(isLedgerDebugEvent).sort((a, b) => a.timestamp - b.timestamp);
  const selected: Array<ActivityLike & { hash: string }> = [];
  const seenHashes = new Set<string>();

  for (const event of filtered) {
    const hash = fingerprint(event);
    if (seenHashes.has(hash)) continue;
    seenHashes.add(hash);
    if (shouldArchive(event, state, hash)) {
      selected.push({ ...event, hash });
    }
  }

  const summary = {
    limit: args.limit,
    dryRun: args.dryRun,
    fetched: events.length,
    ledgerDebugEvents: filtered.length,
    toArchive: selected.length,
    archiveDir: args.outputDir,
    stateFile: args.stateFile,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (args.dryRun || selected.length === 0) return;

  for (const event of selected) {
    const day = toDayKey(event.timestamp);
    const outPath = join(args.outputDir, `${day}.jsonl`);
    await appendJsonlLine(outPath, {
      timestamp: event.timestamp,
      isoTime: new Date(event.timestamp).toISOString(),
      agentName: event.agentName,
      type: event.type,
      marker: LEDGER_MARKERS.find((marker) => event.content.includes(marker)) ?? null,
      hash: event.hash,
      content: event.content,
      archivedAt: new Date().toISOString(),
    });
  }

  const maxTimestamp = Math.max(...selected.map((item) => item.timestamp));
  const fingerprintsAtMax = selected.filter((item) => item.timestamp === maxTimestamp).map((item) => item.hash);
  const nextState: ArchiveState = {
    lastArchivedAtMs: maxTimestamp,
    lastTimestampFingerprints: fingerprintsAtMax,
  };

  await mkdir(dirname(args.stateFile), { recursive: true });
  await writeFile(args.stateFile, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  console.log(`Archived ${selected.length} ledger debug events.`);
}

main().catch((error) => {
  console.error("Failed to archive ledger debug payloads:", error);
  process.exit(1);
});
