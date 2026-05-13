import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
import type { ImportSource } from "./lib/rssImport";
import { importRssSources, requireConvexUrlFromEnv } from "./lib/rssImport";

dotenv.config({ path: ".env.local" });

type GithubContentItem = {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
};

function titleCaseWords(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function humanizeFeedFilename(filename: string): string {
  const base = filename
    .replace(/^feed_/, "")
    .replace(/\.xml$/i, "")
    .replaceAll("_", " ")
    .trim();
  return titleCaseWords(base);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "mission-control-importer",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch ${url} (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function main() {
  const client = new ConvexHttpClient(requireConvexUrlFromEnv());

  console.log("Fetching Olshansk/rss-feeds list...");
  const contentsUrl =
    "https://api.github.com/repos/Olshansk/rss-feeds/contents/feeds?ref=main";
  const items = await fetchJson<GithubContentItem[]>(contentsUrl);

  const sources: ImportSource[] = items
    .filter((item) => item.type === "file")
    .filter((item) => item.name.toLowerCase().endsWith(".xml"))
    .filter((item) => !!item.download_url)
    .map((item) => ({
      name: humanizeFeedFilename(item.name),
      url: item.download_url as string,
      category: "Olshansk",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found ${sources.length} feeds. Checking existing sources...`);

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
    `Done. Added: ${result.added}. Skipped (already present): ${result.skipped}. Failed: ${result.failed}.`,
  );
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
