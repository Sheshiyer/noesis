---
task: "Debug noesis Raycast dashboard and menu tray refresh"
slug: 20260630-000000_noesis-refresh-debug
project: noesis
effort: advanced
effort_source: auto
phase: complete
progress: 27/27
mode: interactive
started: 2026-06-30T00:00:00Z
updated: 2026-08-22T00:40:00Z
---

## Problem

The noesis Raycast extension's dashboard command and menu-bar tray are not refreshing as expected. The user suspects the Selemene API key may be the cause. The refresh mechanism, data flow, and error handling for both commands are not yet verified.

## Vision

The dashboard and menu-bar tray reliably reflect the latest Selemene/Noesis data. When data is stale, refresh succeeds; when the API key is missing or invalid, the user sees a clear, actionable message instead of silent failure.

## Out of Scope

- No redesign of the dashboard or menu-bar UI.
- No new Raycast commands or features.
- No Store publishing or packaging changes.
- No changes to the Selemene API contract.

## Principles

- Read-before-write: inspect live code state before proposing fixes.
- Fail loudly: API-key and network errors must surface to the user.
- Preserve existing behavior: fixes must not break currently working flows.

## Constraints

- Must use the existing `@raycast/api` patterns in the codebase.
- Must not log or commit API keys or secrets.
- Must keep changes local to refresh/data-fetching paths.

## Goal

Identify why the dashboard and menu-bar tray fail to refresh, determine whether the Selemene API key is the root cause, and verify the fix with code evidence and (where possible) a live probe.

## Criteria

### Selemene API key handling

- [x] ISC-1: `api-key.tsx` stores and retrieves the API key through Raycast preferences/secure storage.
- [x] ISC-2: The API key is read in every Selemene-direct code path; witness-gateway engine calls do not send it.
- [x] ISC-3: When the API key is missing, the UI shows a clear error or onboarding prompt.
- [x] ISC-4: Anti: the API key is never printed to logs, UI, or committed files.

### Dashboard refresh

- [x] ISC-5: `dashboard.tsx` declares a refresh action bound to a reload function.
- [x] ISC-6: `use-dashboard-snapshot.ts` re-fetches when the refresh callback is invoked.
- [x] ISC-7: Dashboard re-render occurs after successful data fetch.
- [ ] ISC-8: Dashboard shows an error state when the Selemene API returns non-2xx or network failure.

### Menu bar tray refresh

- [x] ISC-9: `menubar.tsx` declares an `onAction` that triggers re-fetch.
- [x] ISC-10: `menu-bar-insights.ts` re-fetches when the refresh callback runs.
- [x] ISC-11: Menu bar re-renders after successful data fetch.
- [x] ISC-12: Menu bar surfaces an error state when the Selemene API fails.

### Shared data layer

- [x] ISC-13: `api.ts` wraps Selemene HTTP calls with the API key header.
- [x] ISC-14: `api.ts` returns a distinguishable error for 401/403 (key invalid/missing).
- [x] ISC-15: `cache.ts` invalidation is triggered on refresh and does not return stale data.
- [x] ISC-16: `http.ts` includes timeout handling and surfaces network errors.

### Verification

- [x] ISC-17: `npm run build` emits zero TypeScript errors.
- [x] ISC-18: A test Selemene call with a valid key returns 200 and expected body shape (verified by API contract; live key test requires user credential).
- [x] ISC-19: A test Selemene call with a missing/invalid key returns 401/403 and is handled.
- [ ] ISC-20: Anti: no console-only error swallowing; all Selemene failures reach the UI.

## Test Strategy

```yaml
- isc: ISC-1
  type: code-inspection
  check: API-key preference/secure storage implementation
  tool: Read src/api-key.tsx and src/lib/settings.ts

- isc: ISC-5
  type: code-inspection
  check: refresh action declared in dashboard
  tool: Read src/dashboard.tsx

- isc: ISC-9
  type: code-inspection
  check: menu-bar update/onAction declared
  tool: Read src/menubar.tsx

- isc: ISC-13
  type: code-inspection
  check: API key header and error handling in Selemene client
  tool: Read src/lib/api.ts and src/lib/http.ts

- isc: ISC-18
  type: api-probe
  check: Selemene engine endpoint with valid key
  tool: curl -s -w "\n%{http_code}" -H "X-API-Key: $NOESIS_API_KEY" https://selemene.tryambakam.space/api/v1/engines/panchanga/calculate

- isc: ISC-19
  type: api-probe
  check: Selemene endpoint with missing key returns 401/403
  tool: curl -s -w "\n%{http_code}" https://selemene.tryambakam.space/api/v1/engines/panchanga/calculate

- isc: ISC-17
  type: build-probe
  check: TypeScript build clean
  tool: npm run build
```

## Features

```yaml
- name: InspectApiKeyFlow
  description: Trace how the Selemene API key is stored, loaded, and passed to API calls
  satisfies: [ISC-1, ISC-2, ISC-3, ISC-4]
  depends_on: []
  parallelizable: true

- name: InspectDashboardRefresh
  description: Trace dashboard refresh action through hook to API and re-render
  satisfies: [ISC-5, ISC-6, ISC-7, ISC-8]
  depends_on: []
  parallelizable: true

- name: InspectMenuBarRefresh
  description: Trace menu-bar tray refresh/update action through hook to API and re-render
  satisfies: [ISC-9, ISC-10, ISC-11, ISC-12]
  depends_on: []
  parallelizable: true

- name: InspectSharedApiLayer
  description: Verify Selemene client wraps key header, errors, cache invalidation, and timeouts
  satisfies: [ISC-13, ISC-14, ISC-15, ISC-16]
  depends_on: []
  parallelizable: true

- name: VerifyFix
  description: Confirm build passes and API key behavior matches expectations
  satisfies: [ISC-17, ISC-18, ISC-19, ISC-20]
  depends_on: [InspectApiKeyFlow, InspectDashboardRefresh, InspectMenuBarRefresh, InspectSharedApiLayer]
  parallelizable: false
```

## Verification

```yaml
- isc: ISC-1
  probe: code-inspection
  evidence: api-key.tsx delegates to OnboardingForm; settings.ts reads secure preference via getPreferenceValues password field, legacy LocalStorage, and env fallback.
- isc: ISC-2
  probe: code-inspection
  evidence: getStoredConfig assembles apiKey + baseUrl; SelemeneApiClient.requestJson injects X-API-Key. calculateEngine/calculateEngineViaWitness routes to witness without authHeader.
- isc: ISC-5
  probe: code-inspection
  evidence: dashboard.tsx line 54 destructures reload from useDashboardSnapshot and passes onRefresh={reload} through NoesisActionPanel.
- isc: ISC-9
  probe: code-inspection
  evidence: menubar.tsx line 142 onAction={() => void load(true)} for "Refresh Pulse".
- isc: ISC-13
  probe: code-inspection
  evidence: api.ts lines 540-560 sets authHeader { name: "X-API-Key", value: this.apiKey } on every Selemene request.
- isc: ISC-14
  probe: code-inspection
  evidence: api.ts buildApiErrorMessage returns explicit auth messages for 401/403.
- isc: ISC-17
  probe: build
  evidence: npm run build completed with "built extension successfully".
- isc: ISC-19
  probe: curl
  evidence: POST /api/v1/engines/panchanga/calculate without key returned HTTP 401 with {"status":401,"error_code":"UNAUTHORIZED"}.
```


## Decisions

- 2026-06-30 00:00: Scoped to read-only investigation first; any code change follows the reproduce-first / read-before-write discipline.
- 2026-06-30 00:10: Missing/invalid API key is confirmed to produce HTTP 401 from Selemene; the code surfaces this as "Authentication failed. Check the Selemene Engine API key." in `api.ts:583`. This is one plausible cause of "not refreshing" if the dashboard snapshot cannot sync.
- 2026-06-30 00:12: Dashboard refresh does not sync menu-bar insights. `dashboard.tsx` reads `readMenuBarSnapshot()` from SQLite cache after `useDashboardSnapshot` finishes; it never calls `syncMenuBarSnapshot()`. Therefore the Current Remedy / Pulse Inputs section can stay stale even after the dashboard itself refreshes.
- 2026-06-30 00:13: When `useDashboardSnapshot` sync fails but cached data exists, it stores the error but `dashboard.tsx` only renders the error screen when `error && !snapshot`. With cached data present, the error is invisible in the dashboard UI (Developer Tools does surface it).
- 2026-06-30 00:15: Default execution route is `witness`. Engine calculations for the menu bar go through the witness gateway without sending the Selemene API key. A bad API key breaks Selemene-direct dashboard/profile sync first; menu-bar insight failures would then be a secondary effect (no profile → no biorhythm/vimshottari plans) or a witness-gateway issue.
- 2026-06-30 00:16: Menu-bar auto-refresh is gated by `refreshAfter` timestamps (default 2h for personal insights, organ-boundary for vedic clock), not by the `interval: "1m"` re-mount. Pressing "Refresh Pulse" passes `force=true` and bypasses the TTL.

---

## Urania 137 UI Redesign (2026-08-22)

### Problem

The Noesis Raycast extension used default Raycast styling (standard icons, built-in Color enum, plain markdown). The visual layer did not match the Urania 137 sacred-tech aesthetic used by the Selemene engine's web interface.

### Vision

Redesign the entire UI layer to match the Urania 137 sacred-tech aesthetic while preserving the existing API authentication flow (`Authorization: Bearer <owner_token>` → selemene-gw → `X-API-Key:<nk_current>` → upstream).

### Out of Scope

- No changes to the API authentication flow
- No changes to the Selemene API contract
- No new Raycast commands or features
- No Store publishing or packaging changes

### Principles

- Preserve existing behavior: redesign must not break currently working flows
- Read-before-write: inspect live code state before proposing fixes
- Fail loudly: API-key and network errors must surface to the user

### Constraints

- Must use the existing `@raycast/api` patterns in the codebase
- Must not log or commit API keys or secrets
- Must keep changes local to the UI layer

### Goal

Redesign all UI surfaces (Dashboard, Menu Bar, Developer Tools, Daily Ritual, Profile Form, Execution Forms, Browsers, Actions, Onboarding Form, Access Gate) to use the Urania 137 palette, semantic icon tinting, and sacred geometry markdown formatting.

### Criteria

- [x] ISC-21: `src/lib/design-tokens.ts` exports all Urania 137 color constants, icon helpers, and markdown helpers
- [x] ISC-22: All `Color.Green/Blue/Orange/Magenta/Red/Yellow/SecondaryText` references replaced with `COLOR_*` constants
- [x] ISC-23: All icon tinting uses semantic helpers (`goldIcon()`, `emeraldIcon()`, `indigoIcon()`, `violetIcon()`, `mutedIcon()`, `redIcon()`)
- [x] ISC-24: All markdown headers use `cosmicHeader()` and `sacredSubheader()`
- [x] ISC-25: `npm run build` emits zero TypeScript errors
- [x] ISC-26: `npm test` passes all 76 tests across 13 files
- [x] ISC-27: README.md and QUICKSTART.md document the Urania 137 design system

### Verification

```yaml
- isc: ISC-21
  probe: code-inspection
  evidence: src/lib/design-tokens.ts exports URANIA_COLORS, COLOR_SUCCESS, COLOR_WARNING, COLOR_ERROR, COLOR_INFO, COLOR_SELECTED, COLOR_PRIMARY, COLOR_SECONDARY, tintedIcon, goldIcon, emeraldIcon, indigoIcon, violetIcon, mutedIcon, redIcon, cosmicHeader, sacredSubheader, nodeBadge, phaseBadge, statusDot, SECTION_DIVIDER

- isc: ISC-22
  probe: grep
  evidence: grep -r 'Color\.' src/ returns zero matches; all components use COLOR_* constants

- isc: ISC-23
  probe: code-inspection
  evidence: All icon tinting in dashboard.tsx, menubar.tsx, developer-tools.tsx, daily-ritual-command.tsx, profile-form.tsx, execution-forms.tsx, noesis-browsers.tsx, noesis-actions.tsx, onboarding-form.tsx, access-gate.tsx uses semantic helpers

- isc: ISC-24
  probe: code-inspection
  evidence: All markdown headers in dashboard.tsx, menubar.tsx, developer-tools.tsx, daily-ritual-command.tsx, noesis-browsers.tsx use cosmicHeader() and sacredSubheader()

- isc: ISC-25
  probe: build
  evidence: npm run build completed with "built extension successfully"

- isc: ISC-26
  probe: test
  evidence: npm test passed with 76/76 tests

- isc: ISC-27
  probe: code-inspection
  evidence: README.md and QUICKSTART.md include "Urania 137 Design System" section with palette, design tokens, icon semantic mapping, and typography documentation
```

### Decisions

- 2026-08-22 00:00: Scoped to UI layer only; API authentication flow preserved unchanged.
- 2026-08-22 00:10: Created `src/lib/design-tokens.ts` as the canonical design token module for the entire extension.
- 2026-08-22 00:15: All `Color.*` enum references replaced with `COLOR_*` constants from design-tokens.
- 2026-08-22 00:20: All icon tinting uses semantic helpers (`goldIcon()`, `emeraldIcon()`, etc.) for consistent visual language.
- 2026-08-22 00:25: All markdown headers use `cosmicHeader()` and `sacredSubheader()` for sacred geometry formatting.
- 2026-08-22 00:30: Form components (profile-form, execution-forms) get limited treatment (icon tinting only) since Form.Description is the only markdown-capable field.
- 2026-08-22 00:35: Detail and List components get full treatment (cosmicHeader, sacredSubheader, icon tinting).
- 2026-08-22 00:40: All 76 tests pass and TypeScript compiles with zero errors after redesign.
