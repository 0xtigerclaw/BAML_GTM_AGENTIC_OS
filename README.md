# BAML GTM Agentic OS

Agentic GTM OS demo for BAML / BoundaryML. It adapts the Mission Control scaffold into a developer opportunity radar: find BAML-fit developer complaints, approve the best moments, and generate a technical response package for human review.

## Kept
- Next.js dashboard shell
- Convex agents, tasks, activity, notifications, skills, memory, graph, RSS/scout primitives
- Gateway dispatcher, scheduler, Telegram bridge, and agent prompt files
- LinkedIn/scout content pipeline primitives, pending the target use-case decision

## Removed
- Hiring/job-board routes
- Application review routes
- Gmail hiring feedback setup
- Form-filler page, Chrome extension, and Porter form action
- Candidate, job, application, email signal, and optimization snapshot schema tables

## Local Run

```bash
npm install
npx convex dev --local --local-force-upgrade --typecheck disable
npm run dev -- --port 3001
```

The scaffold uses its own local Convex deployment name:

```text
local:local-swayamshah1000-mission_control_scaffold
```

## Free Hosted Demo

Use this mode for assignment reviewers. It does not require the local OpenClaw Gateway, ChatGPT auth, OpenAI keys, or live scraping.

Recommended free stack:

- Vercel Hobby for the Next.js app.
- Convex Free for the hosted backend.

The deployable demo path is:

```text
candidate -> human approval -> hosted OpenClaw Gateway simulation -> completed BAML opportunity package
```

Set these environment variables in Vercel after creating a hosted Convex deployment:

```text
NEXT_PUBLIC_CONVEX_URL=<your hosted Convex URL>
NEXT_PUBLIC_CONVEX_SITE_URL=<your hosted Convex site URL if Convex provides one>
NEXT_PUBLIC_HOSTED_DEMO=true
```

Recommended publish flow:

1. Push this project as its own GitHub repo.
2. Create a Convex project on the Free plan and deploy the Convex functions with `npx convex deploy`.
3. Import the GitHub repo into Vercel on the Hobby plan.
4. Add the Vercel environment variables above.
5. Deploy. The reviewer can approve a test opportunity and immediately open a completed BAML GTM mission package.

Keep `NEXT_PUBLIC_HOSTED_DEMO=true` for the public review link. This keeps the demo deterministic and prevents it from depending on a local process.

Local gateway mode still exists for the full runtime:

```text
candidate -> human approval -> OpenClaw Gateway -> Porter -> Torvalds -> Ogilvy -> Carnegie -> Tigerclaw
```

For local gateway mode, set `NEXT_PUBLIC_HOSTED_DEMO=false` or omit it, then run:

```bash
npm run gateway:dispatcher
```
