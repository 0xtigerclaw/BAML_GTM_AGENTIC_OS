# RSS Bulk Imports

This project uses a shared bulk-import pipeline for RSS sources.

## Core modules

- `lib/rssImport.ts`
  - `requireConvexUrlFromEnv()`: validates `NEXT_PUBLIC_CONVEX_URL`.
  - `importRssSources()`: dedupes by existing source URLs and writes through `api.rssActions.addVerifiedSource`.
- `lib/rssCatalogs.ts`
  - Contains catalog builders (currently `buildNeoLabsCatalog()`).

## Import scripts

- `tools/scripts/sync_rss_sources.ts`: unified orchestrator for source packs (recommended entrypoint).
- `tools/scripts/import_neolabs_feeds.ts`: imports sources from `buildNeoLabsCatalog()`.
- `tools/scripts/sync_neolabs_official_sources.ts`: adds/updates `NeoLabs` official-site feeds using curated domains and Convex feed discovery.
- `tools/scripts/sync_neolabs_proxy_sources.ts`: fallback importer that ingests proxy-feeds for unresolved NeoLabs only when no official feed exists for the lab.
- `tools/scripts/import_olshansk_feeds.ts`: fetches Olshansk feed list from GitHub, maps to sources, then imports via shared utility.

Both scripts now use the same Convex ingestion path and result format.

## NeoLabs official sync behavior

- `tools/scripts/sync_neolabs_official_sources.ts` is the strict official-only updater for NeoLabs.
- It is non-destructive (add/update only), and never bulk-deletes existing sources.
- It validates discovered feeds against the expected official domain and records unresolved labs with explicit reasons.
- Candidate endpoint breadth is tunable with `NEOLABS_MAX_ENTRYPOINTS` (default: `8`) to balance coverage vs run time.

## Commands

- `npm run sync:sources`
  - default packs: `olshansk,neolabs-official`
  - custom packs: `npm run sync:sources -- --packs=olshansk` or `--packs=neolabs-google,neolabs-proxy`
- `npm run import:feeds:neolabs`
- `npm run import:feeds:neolabs:official`
- `npm run import:feeds:neolabs:proxy`
- `npm run import:feeds:olshansk`

## Destructive maintenance (explicit only)

These are intentionally separate from sync/import flows and are never called by `sync:sources`.

- `npm run maint:destructive:rss:purge -- --category=NeoLabs --host-contains=feedfry --execute --confirm=DELETE_RSS_SOURCES`
  - dry-run by default; requires `--execute` and confirmation token.
  - refuses unfiltered delete unless `--allow-all` is explicitly set.
- `npm run maint:destructive:links:ignore -- --status=pending --host-contains=example.com --older-than-days=30 --execute --confirm=IGNORE_SCOUTED_LINKS`
  - marks matching `scouted_links` as `ignored` (no delete path in normal sync).

## Ingestion guarantees

- Existing sources are skipped when either `url` or `originalUrl` already exists.
- New sources are validated by `api.rssActions.addVerifiedSource` before insert/update.
- Failures are reported per source and summarized at the end.
- `tools/scripts/sync_neolabs_official_sources.ts` is strict and non-destructive: it only uses curated official domains, intentionally avoids generic news feeds, and does not delete existing sources.
- `tools/scripts/sync_neolabs_proxy_sources.ts` is also non-destructive and only backfills unresolved labs (it skips labs that already have official non-proxy feeds).
