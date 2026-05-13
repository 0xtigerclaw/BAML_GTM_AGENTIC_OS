# Operational Scripts

This folder contains one-off development, maintenance, import, debug, and migration scripts that used to live at the repository root.

The main app code lives in:

- `app/`
- `convex/`
- `gateway/`
- `lib/`
- `services/`
- `squad/baml-gtm/`

Common script entrypoints are exposed through `package.json`, for example:

```bash
npm run sync:sources
npm run import:feeds:neolabs:official
npm run trigger:ledger:update
```

Most scripts expect `.env.local` and a valid `NEXT_PUBLIC_CONVEX_URL` when run locally.
