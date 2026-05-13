import * as dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { buildNeoLabsCatalog } from "./lib/rssCatalogs";
import { importRssSources, requireConvexUrlFromEnv } from "./lib/rssImport";

dotenv.config({ path: ".env.local" });

async function main() {
  const client = new ConvexHttpClient(requireConvexUrlFromEnv());
  const sources = buildNeoLabsCatalog();
  const result = await importRssSources(client, sources, (event) => {
    if (event.status === "added") {
      process.stdout.write(`Added: ${event.source.name}\n`);
      return;
    }
    if (event.status === "failed") {
      process.stdout.write(`Failed: ${event.source.name} :: ${event.error}\n`);
    }
  });

  console.log(
    `Done. Added: ${result.added}. Skipped: ${result.skipped}. Failed: ${result.failed}.`,
  );
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
