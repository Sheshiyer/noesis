# ISA — Urania 137 UI Redesign

> NOESIS · Algorithm · 2026-08-22

## Ideal State

The Raycast noesis extension UI is redesigned to match the Urania 137 sacred-tech aesthetic — the design system used by the Selemene engine's web interface. The API authentication flow (`Authorization: Bearer <owner_token>` → selemene-gw → `X-API-Key:<nk_current>` → upstream) is preserved unchanged. Only the visual layer is redesigned.

## Success Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| SC1 | Urania 137 palette applied consistently | All UI surfaces use Sacred Gold, Witness Violet, Flow Indigo, Coherence Emerald, Void Black, Parchment |
| SC2 | Design tokens module is single source of truth | `src/lib/design-tokens.ts` exports all colors, icons, markdown helpers |
| SC3 | No Raycast Color enum references remain | `grep -r "Color\." src/` returns zero matches |
| SC4 | API auth flow preserved | Bearer token auth to selemene-gw works unchanged |
| SC5 | All tests pass | `npm test` passes (76 tests across 13 files) |
| SC6 | TypeScript compiles | `npm run build` passes with no type errors |
| SC7 | Onboarding form redesigned | Login form uses cosmic aesthetic with gold accents |
| SC8 | Access gate redesigned | Gate screen uses sacred geometry framing |
| SC9 | Dashboard redesigned | Main dashboard uses orbital node styling |
| SC10 | Menu bar redesigned | Menu items use gold-accented styling |
| SC11 | Developer tools redesigned | Diagnostic panels use cosmic aesthetic |
| SC12 | All components use design tokens | Every component imports from `design-tokens.ts` |

## Anti-Criteria (explicitly NOT in scope)

- API authentication changes (bearer token flow preserved)
- OAuth migration (explicitly rejected by user)
- Selemene server-side changes
- Raycast Store submission (separate process)
- New feature additions (only visual redesign)

## Gate Conditions

| Gate | Condition | Phase |
|------|-----------|-------|
| G1 | Design tokens module created and tested | Observe→Think |
| G2 | All Color enum references migrated to design tokens | Think→Plan |
| G3 | Formatters updated to use Urania 137 palette | Plan→Build |
| G4 | Onboarding form redesigned with cosmic aesthetic | Build→Execute |
| G5 | Dashboard redesigned with orbital node styling | Execute→Verify |
| G6 | All remaining components redesigned | Verify→Learn |
