## [Unreleased]

### Added
- Added a role-aware access model: Witness users get the Daily Ritual cockpit and Pulse & Remedy companion, while API-key operator mode unlocks engines, workflows, readings, diagnostics, raw payload actions, and direct Selemene workbench flows.
- Added local Ritual Defaults so ordinary Witness mode can reuse birth data, timezone, precision, and default workflow context without requiring an access key first.

### Changed
- Dashboard, Daily Witness, Daily Practice, Ritual Defaults, and Pulse & Remedy now stay useful in Witness mode; operator-only commands render an access gate instead of pushing users through setup.
- Public copy now frames the extension around current pattern, authorship, Witness mode, and operator access instead of key-first onboarding.

### Fixed
- Pulse & Remedy can derive a NadaBrahman raga remedy plan even with partial or zero cached source pulses.
- When no current raga is available, the tray names the missing condition instead of going quiet.
- Execution routing now falls back to Witness for ordinary A/C surfaces when Selemene Direct is selected without an access key.

## [1.0.1] - 2026-06-30

### Fixed
- Dashboard now surfaces Selemene sync errors even when cached data is present.
- Dashboard Refresh now also refreshes Current Remedy and Pulse Inputs by syncing menu-bar insights.

## [Initial Release] - 2026-06-05

- Added Tryambakam Noesis as a Raycast-native ritual surface powered by the Selemene Engine and Witness gateway.
- Added API-key onboarding, shared profile defaults, live engine and workflow execution forms, Daily Witness, Daily Practice, and interpreted reading result pages.
- Added explicit API key rotation that clears stale local identity data before warming the new account profile.
- Added a local SQLite cache plus a pulse-and-remedy menu bar that surfaces NadaBrahman remedies with TCM organ, biorhythm, and Vimshottari source context.
