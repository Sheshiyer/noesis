# Tryambakam Noesis Quick Start

## 1. Open The Current Pattern

Open `Dashboard` in Raycast. Witness mode works without an access key and keeps the ordinary surfaces available:

- `Dashboard` - Daily Ritual cockpit for current pattern, pulse inputs, remedy signal, and next action
- `Daily Witness` - overview-first one-tap witness ritual
- `Daily Practice` - direct entry to the fallback `daily-practice` workflow
- `Ritual Defaults` - birth data, timezone, default precision, and default workflow context
- `Pulse & Remedy` - menu bar signal with source pulse fallback

## 2. Add Ritual Defaults

Open `Ritual Defaults` and add the context you want the ritual surfaces to reuse:

- birth date
- birth time
- birth location
- timezone
- default precision
- default workflow

These values can stay local in Witness mode. If operator access is connected, the same form can also sync the profile to Selemene.

## 3. Keep The Route Explicit

In Raycast preferences, `Execution Route` can stay on `Witness Gateway` for ordinary use.

Available routing options:

- `Witness Gateway` - default route for Daily Ritual and Pulse & Remedy without forwarding an access key
- `Selemene Direct` - operator route for direct engine and workflow work when an access key is connected

If `Selemene Direct` is selected without an access key, the extension falls back to Witness for ordinary A/C surfaces.

## 4. Unlock Operator Depth

Open `Access Key` only when you want the B-lane workbench:

- direct Noesis Engine runs
- direct workflow execution
- cached reading archive
- raw payload copy actions
- cache and sync diagnostics
- route instrumentation

Enter:

- `Tryambakam Noesis Access Key` - your `nk_...` key
- `Noesis Base URL` - usually `https://selemene.tryambakam.space`

The command validates the account before saving configuration and warming the local cache.

## 5. Understand What Stays Local

The extension keeps a local SQLite cache at Raycast `environment.supportPath` for accessibility and continuity.

By default it stores:

- service health and rate-limit metadata
- engine catalog
- workflow catalog
- local ritual defaults or synced profile snapshot
- usage snapshots when operator access is connected
- recent readings with minimized payloads when operator access is connected
- pulse insight snapshots

Secrets are not stored in SQLite. The preferred key path is the Raycast secure password preference.

## 6. Useful Preferences

The most important operational preferences are:

- `apiKey`
- `baseUrl`
- `witnessUrl`
- `executionRoute`
- `readingHistoryLimit`
- `cacheRawPayloads`
- `pulseMode`

`pulseMode` controls the source-pulse fallback when a current NadaBrahman remedy is unavailable.

## 7. Urania 137 Design System

The extension uses the Urania 137 sacred-tech aesthetic — the visual language of the Selemene engine. All UI surfaces use a unified palette, semantic icon tinting, and sacred geometry markdown formatting.

### Palette

| Token | Hex | Usage |
| --- | --- | --- |
| Sacred Gold | `#C5A017` | Primary actions, active states, highlights |
| Witness Violet | `#2D0050` | Selected states, accent backgrounds |
| Flow Indigo | `#0B50FB` | Focus states, links, navigation |
| Coherence Emerald | `#10B5A7` | Success states, secondary actions |
| Void Black | `#070B1D` | Dark theme backgrounds |
| Parchment | `#F0EDE3` | Light theme backgrounds |

### Design Tokens

All design tokens are centralized in `src/lib/design-tokens.ts`:

- **Color constants**: `COLOR_SUCCESS`, `COLOR_WARNING`, `COLOR_ERROR`, `COLOR_INFO`, `COLOR_SELECTED`, `COLOR_PRIMARY`, `COLOR_SECONDARY`
- **Icon helpers**: `goldIcon()`, `emeraldIcon()`, `indigoIcon()`, `violetIcon()`, `mutedIcon()`, `redIcon()` — wrap `tintedIcon(icon, color)` for semantic icon tinting
- **Markdown helpers**: `cosmicHeader()`, `sacredSubheader()`, `nodeBadge()`, `phaseBadge()`, `statusDot()`, `SECTION_DIVIDER`
- **Dynamic colors**: `Color.Dynamic` variants for light/dark theme support

### Icon Semantic Mapping

| Color | Semantic Meaning | Helper |
| --- | --- | --- |
| Gold | Primary actions, key operations | `goldIcon()` |
| Emerald | Witness/observe, success states | `emeraldIcon()` |
| Indigo | Navigation, remedy, focus | `indigoIcon()` |
| Violet | Workflow, selected states | `violetIcon()` |
| Muted | Secondary, utility actions | `mutedIcon()` |
| Red | Errors, destructive actions | `redIcon()` |

### Typography

- `cosmicHeader(text)`: Renders as `# TEXT` (uppercase) for section headers
- `sacredSubheader(text)`: Renders as `## TEXT` for subsection headers
- `SECTION_DIVIDER`: Horizontal rule (`---`) for visual separation

## 8. Local Verification

```bash
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
PATH=/opt/homebrew/bin:$PATH npm test
PATH=/opt/homebrew/bin:$PATH npm run build
```

## 9. Next References

- [README](./README.md)
- [Changelog](./CHANGELOG.md)
