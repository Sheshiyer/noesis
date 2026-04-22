# Selemene Noesis Raycast Extension

Raycast client for Selemene with onboarding, a local SQLite cache, execution flows, and a live pulse menu bar.

## What It Does

- Onboards a Selemene API key through a Raycast form instead of requiring manual preference edits.
- Validates the key against `GET /api/v1/users/me` using `X-API-Key` auth.
- Stores the API key in Raycast local storage.
- Stores cached service/profile/usage/workflow/engine/reading data in local SQLite under Raycast `environment.supportPath`.
- Reads cached data first, then refreshes stale resources from Selemene with stale-while-revalidate behavior.

## Commands

1. `Dashboard` - Account, service, workflows, usage, reading stats, and recent readings.
2. `Engines` / `Workflows` / `Readings` - Dedicated browsing and execution surfaces instead of refresh-only dashboard rows.
3. `Profile` - Maintain shared birth data, timezone, and reusable preferences once.
4. `Onboarding` - Connect or rotate the Selemene API key and warm the local cache.
5. `Pulse` - Menu bar surface for the current TCM organ plus cached biorhythm and Vimshottari context.

## Configuration

Primary path:

- Run `Noesis Onboarding`
- Paste the Selemene API key (`nk_...`)
- Optionally override the base URL

Fallbacks still supported for development:

- `baseUrl` Raycast preference
- `pulseMode` Raycast preference (`TCM Organ`, `Biorhythm`, or `Vimshottari`)
- `NOESIS_API_BASE_URL` / `SELEMENE_BASE_URL`
- `NOESIS_API_KEY` / `SELEMENE_API_KEY`

Default base URL:

- `https://selemene.tryambakam.space`

## Local Storage Model

- Secret storage: Raycast local storage
- Cache database: `environment.supportPath/noesis-cache.sqlite`
- Cached resources:
  - service health and rate-limit snapshot
  - user profile
  - usage analytics
  - engine catalog
  - workflow catalog plus engine membership
  - recent readings and reading stats
  - menu bar pulse insights for Vedic Clock, biorhythm, and Vimshottari

## Development

```bash
PATH=/opt/homebrew/bin:$PATH npm install
PATH=/opt/homebrew/bin:$PATH npm run dev
```

## Verification

```bash
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
rm -rf /tmp/noesis-testbuild
PATH=/opt/homebrew/bin:$PATH npx tsc --outDir /tmp/noesis-testbuild
node --test /tmp/noesis-testbuild/lib/api.test.js /tmp/noesis-testbuild/lib/cache.test.js
```
