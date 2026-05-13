# Mission Control Startup Protocol

This document defines the standard operating procedure for launching the Mission Control environment.

## One-Command Launch (Recommended)

To start all systems (Frontend, Backend, AI Brain) simultaneously, run:

```bash
./start.sh --detach
```

### No-terminal option (macOS)

If you don’t want to use the terminal, you can double-click:

- `Start Mission Control.command`
- `Mission Control Status.command`
- `Mission Control Logs.command`
- `Stop Mission Control.command`

To stop it later:

```bash
./start.sh stop
```

To check status or view logs:

```bash
./start.sh status
./start.sh logs
```

## Component Breakdown

The `start.sh` script (or `npm run dev:all`) launches three critical processes in parallel:

1.  **Frontend (Next.js)**: Runs on [http://localhost:3000](http://localhost:3000). Visual interface for the dashboard.
2.  **Backend (Convex)**: Runs the real-time database and cloud functions.
    -   Dashboard: `npx convex dashboard` (or view logs in terminal)
3.  **Gateway (AI Brain)**: The `gateway/index.ts` Node.js process.
    -   This is the "Loop" that assigns tasks, drives agents, and executes tools (like Clawdbot).
    -   **Note**: "Clawdbot" is the CLI tool used *by* the Gateway. You do NOT need to start it separately.
    -   **CRITICAL**: If this is not running, agents will stay "Sleeping" and tasks will remain "Assigned" forever.

## Troubleshooting

-   **Stuck Tasks**: If tasks stick in `ASSIGNED`, check if the **GATEWAY** log in the terminal is active. If not, restart the stack.
-   **Terminal Errors**: The unified log is color-coded.
    -   Blue: Next.js
    -   Yellow: Convex
    -   Magenta: Gateway

## X Thread Extractor

Mission Control can enrich tasks from X/Twitter post URLs through a local persistent browser session.

One-time auth bootstrap:

```bash
npm run x:auth
```

Useful environment variables:

- `X_BEARER_TOKEN`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`
- `X_API_KEY` or `X_CONSUMER_KEY`
- `X_API_SECRET` or `X_KEY_SECRET`
- `X_BROWSER_PROFILE_DIR`
- `X_BROWSER_EXECUTABLE_PATH`
- `X_BROWSER_CHANNEL`
- `X_BROWSER_HEADLESS` (`false` by default; set to `true` only if you want to force headless extraction)
- `X_BROWSER_REMOTE_DEBUGGING_PORT`
- `X_BROWSER_MAX_SCROLLS`
- `X_BROWSER_NAV_TIMEOUT_MS`
