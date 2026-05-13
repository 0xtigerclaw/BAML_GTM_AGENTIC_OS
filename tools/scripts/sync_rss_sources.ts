import { spawnSync } from "child_process";

type Pack = "olshansk" | "neolabs-google" | "neolabs-official" | "neolabs-proxy";

const PACK_TO_SCRIPT: Record<Pack, string> = {
  olshansk: "tools/scripts/import_olshansk_feeds.ts",
  "neolabs-google": "tools/scripts/import_neolabs_feeds.ts",
  "neolabs-official": "tools/scripts/sync_neolabs_official_sources.ts",
  "neolabs-proxy": "tools/scripts/sync_neolabs_proxy_sources.ts",
};

function parsePacks(argv: string[]): Pack[] {
  const packArg = argv.find((arg) => arg.startsWith("--packs="));
  if (!packArg) return ["olshansk", "neolabs-official"];

  const raw = packArg.split("=")[1] || "";
  const values = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const packs: Pack[] = [];
  for (const value of values) {
    if (value === "olshansk" || value === "neolabs-google" || value === "neolabs-official" || value === "neolabs-proxy") {
      packs.push(value);
      continue;
    }
    throw new Error(`Unknown pack: ${value}. Valid packs: olshansk, neolabs-google, neolabs-official, neolabs-proxy`);
  }
  if (packs.length === 0) {
    throw new Error("No valid packs provided.");
  }
  return packs;
}

function runScript(scriptPath: string): void {
  const result = spawnSync("npx", ["tsx", scriptPath], {
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    throw new Error(`Script failed: ${scriptPath} (exit ${result.status})`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const packs = parsePacks(args);
  console.log(`Running source packs: ${packs.join(", ")}`);

  for (const pack of packs) {
    const scriptPath = PACK_TO_SCRIPT[pack];
    console.log(`\n=== ${pack} -> ${scriptPath} ===`);
    runScript(scriptPath);
  }

  console.log("\nAll selected source packs completed.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
