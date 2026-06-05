# Tryambakam Noesis Quick Start

## 1. Connect The Extension

Open `API Key` in Raycast and enter:

- `Tryambakam Noesis Access Key` - your `nk_...` key
- `Noesis Base URL` - usually `https://selemene.tryambakam.space`

The command validates the account before saving configuration and warming the local cache.

## 2. Keep The Route Explicit

In Raycast preferences, leave `Execution Route` on `Witness Gateway` unless you intentionally want the direct Selemene path for operator testing.

Available routing options:

- `Witness Gateway` - default path for ritual-facing engine and workflow execution
- `Selemene Direct` - explicit operator path when you want to bypass Witness enrichment

## 3. Open The Main Surfaces

Use the command set this way:

- `Dashboard` - ritual-first overview and first cache warm
- `Engines` - single-engine runs
- `Workflows` - multi-engine synthesis
- `Readings` - local history and interpreted result pages
- `Profile` - birth data, timezone, default precision, default workflow
- `Daily Witness` - overview-first one-tap witness ritual
- `Daily Practice` - direct entry to the fallback `daily-practice` workflow
- `Developer Tools` - connection, routing, usage, cache, and sync diagnostics
- `Pulse & Remedy` - menu bar remedy with source pulse fallback

## 4. Understand What Stays Local

The extension keeps a local SQLite cache at Raycast `environment.supportPath` for accessibility and continuity.

By default it stores:

- service health and rate-limit metadata
- engine catalog
- workflow catalog
- profile and usage snapshots
- recent readings with minimized payloads
- pulse insight snapshots

Secrets are not stored in SQLite. The preferred key path is the Raycast secure password preference.

## 5. Useful Preferences

The most important operational preferences are:

- `apiKey`
- `baseUrl`
- `witnessUrl`
- `executionRoute`
- `readingHistoryLimit`
- `cacheRawPayloads`
- `pulseMode`

`pulseMode` now controls the source-pulse fallback when a current NadaBrahman remedy is unavailable.

## 6. Local Verification

```bash
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
PATH=/opt/homebrew/bin:$PATH npm run build
```

## 7. Next References

- [README](./README.md)
- [Changelog](./CHANGELOG.md)
