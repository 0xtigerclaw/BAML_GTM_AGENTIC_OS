import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { NEOLABS_NAMES } from "../../lib/rssCatalogs";
import { requireConvexUrlFromEnv } from "../../lib/rssImport";

dotenv.config({ path: ".env.local" });

type RssSourceRow = {
  _id: Id<"rss_sources">;
  name: string;
  category: string;
  url: string;
  originalUrl?: string | null;
};

const BLOCKED_HOST_FRAGMENTS = [
  "news.google.com",
  "google.com",
  "wikipedia.org",
  "crunchbase.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "instagram.com",
  "facebook.com",
  "reddit.com",
  "github.com",
  "techcrunch.com",
  "forbes.com",
  "bloomberg.com",
  "fandom.com",
  "wizards.com",
  "mit.edu",
  "aausa.org",
  "zoominfo.com",
  "pitchbook.com",
  "cbinsights.com",
];

const MANUAL_SITE_OVERRIDES: Record<string, string> = {
  "Thinking Machines Lab": "https://thinkingmachines.ai",
  "SSI (Safe Superintelligence)": "https://ssi.inc",
  "Skild AI": "https://skild.ai",
  Poolside: "https://poolside.ai",
  "Reflection AI": "https://reflection.ai",
  "Project Prometheus": "https://projectprometheus.ai",
  "Physical Intelligence": "https://www.physicalintelligence.company",
  "Unconventional AI": "https://unconv.ai",
  Humans8n: "https://humans8n.ai",
  "Inflection AI": "https://inflection.ai",
  "Isomorphic Labs": "https://isomorphiclabs.com",
  "AIM Labs": "https://aimlabs.ai",
  Decart: "https://decart.ai",
  "Xaira Therapeutics": "https://www.xaira.com",
  "Sakana AI": "https://sakana.ai",
  "General Intuition": "https://www.generalintuition.com",
  "Liquid AI": "https://www.liquid.ai",
  "H (The H Company)": "https://hcompany.ai",
  Magic: "https://magic.dev",
  "Periodic Labs": "https://periodiclabs.ai",
  Harmonic: "https://www.harmonic.ai",
  "AI21 Labs": "https://www.ai21.com",
  "Lila Sciences": "https://www.lila.ai",
  "Chai Discovery": "https://www.chaidiscovery.com",
  "Flapping Airplanes": "https://flappingairplanes.com",
  Recursive: "https://recursiveai.co",
  "World Labs": "https://www.worldlabs.ai",
  EvolutionaryScale: "https://www.evolutionaryscale.ai",
  AAI: "https://aai.ai",
  Kyutai: "https://kyutai.org",
  Goodfire: "https://www.goodfire.ai",
  Imbue: "https://imbue.com",
  Reka: "https://reka.ai",
  "Essential AI": "https://www.essential.ai",
  Zyphra: "https://zyphra.com",
  "Nous Research": "https://nousresearch.com",
  Aaru: "https://aaru.ai",
  Simile: "https://simile.ai",
  Isara: "https://isara.ai",
  Moonvalley: "https://www.moonvalley.ai",
  Hark: "https://www.hark.ai",
  "Prime Intellect": "https://www.primeintellect.ai",
  Ndea: "https://ndea.ai",
  "Inception Labs": "https://www.inceptionlabs.ai",
  "Adaption Labs": "https://www.adaptionlabs.com",
  Eldorian: "https://eldorian.ai",
  "Genesis AI": "https://www.ai-genesis.ai",
  "CuspAI": "https://www.cusp.ai",
  Poetiq: "https://poetiq.ai",
  "Axiom Math": "https://axiommath.com",
};

const TOKEN_STOPWORDS = new Set([
  "ai",
  "lab",
  "labs",
  "the",
  "company",
  "safe",
  "superintelligence",
]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeOrigin(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function isBlockedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_HOST_FRAGMENTS.some((fragment) => host.includes(fragment));
  } catch {
    return true;
  }
}

function feedEntrypoints(siteOrigin: string): string[] {
  const trimmed = siteOrigin.replace(/\/+$/, "");
  const ordered = [
    trimmed,
    `${trimmed}/feed`,
    `${trimmed}/index.xml`,
    `${trimmed}/rss.xml`,
    `${trimmed}/blog`,
    `${trimmed}/blog/feed`,
    `${trimmed}/blog/rss.xml`,
    `${trimmed}/blog/atom.xml`,
    `${trimmed}/news`,
    `${trimmed}/news/feed`,
    `${trimmed}/news/rss.xml`,
    `${trimmed}/news/atom.xml`,
  ];
  const unique = [...new Set(ordered)];
  const maxEntrypoints = Math.max(4, Number(process.env.NEOLABS_MAX_ENTRYPOINTS || "8"));
  return unique.slice(0, maxEntrypoints);
}

function expectedLabTokens(labName: string): string[] {
  return labName
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !TOKEN_STOPWORDS.has(token));
}

function hostMatchesLab(url: string, labName: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (isBlockedHost(url)) return false;
    const tokens = expectedLabTokens(labName);
    if (tokens.length === 0) return false;
    return tokens.some((token) => host.includes(token));
  } catch {
    return false;
  }
}

function getRootDomain(hostname: string): string {
  const lower = hostname.toLowerCase();
  const parts = lower.split(".").filter(Boolean);
  if (parts.length <= 2) return lower;
  return parts.slice(-2).join(".");
}

function hostMatchesOrigin(url: string, origin: string): boolean {
  try {
    const feedHost = new URL(url).hostname.toLowerCase();
    const expectedHost = new URL(origin).hostname.toLowerCase();
    const feedRoot = getRootDomain(feedHost);
    const expectedRoot = getRootDomain(expectedHost);
    return feedHost === expectedHost
      || feedHost.endsWith(`.${expectedHost}`)
      || feedRoot === expectedRoot;
  } catch {
    return false;
  }
}

type ParseFeedResult = {
  title?: string;
  items?: Array<unknown>;
  resolvedUrl?: string;
  attemptedUrls?: string[];
  error?: string;
};

function conflictsExistingSource(
  existing: RssSourceRow[],
  labName: string,
  sourceUrl: string,
  canonicalUrl: string,
): RssSourceRow | null {
  const normalized = new Set([sourceUrl, canonicalUrl]);
  for (const row of existing) {
    const rowUrls = [row.url, row.originalUrl ?? ""];
    const intersects = rowUrls.some((url) => normalized.has(url));
    if (!intersects) continue;
    if (row.category === "NeoLabs" && row.name === labName) continue;
    return row;
  }
  return null;
}

async function addOfficialSourceNonDestructive(
  client: ConvexHttpClient,
  existing: RssSourceRow[],
  name: string,
  category: string,
  websiteOrigin: string,
): Promise<{ ok: true; usedUrl: string } | { ok: false; error: string }> {
  const candidates = feedEntrypoints(websiteOrigin);
  let lastError = `No discoverable RSS/Atom feed on ${websiteOrigin}`;
  let baseAttemptError = "";

  for (let index = 0; index < candidates.length; index += 1) {
    const url = candidates[index];
    try {
      const parsed = (await client.action(api.rssActions.parseFeed, {
        url,
      })) as ParseFeedResult;
      if (parsed.error || !parsed.items) {
        lastError = parsed.error ?? lastError;
        if (index === 0) {
          baseAttemptError = lastError;
        }
        if (index === 0 && /fetch failed/i.test(lastError)) {
          return { ok: false, error: lastError };
        }
        if (index >= 3 && /Not an RSS\/Atom\/XML response/i.test(lastError)) {
          return { ok: false, error: lastError };
        }
        continue;
      }

      const finalUrl = parsed.resolvedUrl || url;
      if (!hostMatchesOrigin(finalUrl, websiteOrigin) && !hostMatchesLab(finalUrl, name)) {
        lastError = `Discovered feed host did not match expected domain for ${name}: ${finalUrl}`;
        continue;
      }

      const conflict = conflictsExistingSource(existing, name, url, finalUrl);
      if (conflict) {
        lastError = `URL conflict with existing source "${conflict.name}" (${conflict.category})`;
        continue;
      }

      await client.mutation(api.rss.addVerified, {
        name,
        originalUrl: url,
        url: finalUrl,
        resolvedUrl: finalUrl !== url ? finalUrl : null,
        category,
      });

      return { ok: true, usedUrl: finalUrl };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (index === 0) {
        baseAttemptError = lastError;
      }
      if (index === 0 && /fetch failed/i.test(lastError)) {
        return { ok: false, error: lastError };
      }
    }
  }

  return { ok: false, error: baseAttemptError || lastError };
}

async function main() {
  const convexUrl = requireConvexUrlFromEnv();
  const client = new ConvexHttpClient(convexUrl);
  let existing = (await client.query(api.rss.list, {})) as RssSourceRow[];

  let added = 0;
  let failed = 0;
  let unresolved = 0;
  const unresolvedDetails: Array<{ lab: string; reason: string; origins: string[] }> = [];

  for (const labName of NEOLABS_NAMES) {
    try {
      const override = MANUAL_SITE_OVERRIDES[labName];
      const candidateOrigins = override ? [override] : [];

      const testedOrigins: string[] = [];
      let selected: string | null = null;
      let lastFailureReason = "No discoverable RSS/Atom feed from official-site candidates";
      for (const candidateOrigin of candidateOrigins) {
        const origin = normalizeOrigin(candidateOrigin);
        if (!origin) continue;
        if (isBlockedHost(origin)) continue;
        if (testedOrigins.includes(origin)) continue;
        testedOrigins.push(origin);

        const result = await addOfficialSourceNonDestructive(
          client,
          existing,
          labName,
          "NeoLabs",
          origin,
        );
        if (result.ok) {
          selected = result.usedUrl;
          existing = (await client.query(api.rss.list, {})) as RssSourceRow[];
          break;
        }
        lastFailureReason = result.error;
      }

      if (!selected) {
        unresolved += 1;
        failed += 1;
        const reason = `${lastFailureReason}${testedOrigins.length > 0 ? ` (origins: ${testedOrigins.join(", ")})` : ""}`;
        console.log(
          `Failed: ${labName} :: ${reason}`,
        );
        unresolvedDetails.push({ lab: labName, reason, origins: testedOrigins });
        await delay(120);
        continue;
      }

      added += 1;
      console.log(`Added: ${labName} -> ${selected}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Failed: ${labName} :: ${message}`);
      unresolvedDetails.push({ lab: labName, reason: message, origins: [] });
    }

    await delay(120);
  }

  console.log(
    `Done. Added/updated: ${added}. Failed: ${failed}. Unresolved official site/feed: ${unresolved}. No existing sources were deleted.`,
  );
  if (unresolvedDetails.length > 0) {
    console.log("Unresolved Labs (official RSS missing or blocked):");
    for (const row of unresolvedDetails) {
      console.log(`- ${row.lab}: ${row.reason}`);
    }
  }
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
