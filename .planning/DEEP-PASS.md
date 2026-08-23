# Deep Pass — Urania 137 UI Redesign

> NOESIS · Algorithm · OBSERVE→THINK · 2026-08-22

## 1. MACRO MAP

### Surfaces

| Surface | Current State | Target State |
|---------|---------------|--------------|
| Onboarding Form | Default Raycast styling, API key field | Cosmic aesthetic, gold accents, sacred geometry |
| Access Gate | Plain gate screen | Sacred geometry framing, violet accents |
| Dashboard | Standard List with Color enum | Orbital node styling, Urania 137 palette |
| Menu Bar | Default menu items | Gold-accented items, sacred geometry icons |
| Developer Tools | Standard diagnostic panels | Cosmic diagnostic panels |
| Daily Ritual | Default form styling | Sacred geometry loading states |
| Profile Form | Standard form | Cosmic birth data entry |
| Execution Forms | Default action styling | Gold/emerald action styling |
| Browsers | Standard list browsing | Orbital node browsing experience |

### Components

```
┌─────────────────────────────────────────────────────────────┐
│  Raycast Extension (noesis)                                  │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ design-tokens│──→│ formatters   │──→│ components   │   │
│  │ (palette)    │    │ (colors)     │    │ (UI)         │   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘   │
│         ↑                                        │           │
│  ┌──────────────┐                                │           │
│  │ Urania 137   │                                │           │
│  │ Design System│                                │           │
│  └──────┬───────┘                                │           │
└─────────┼────────────────────────────────────────┼───────────┘
          │                                        │
          ▼                                        ▼
┌─────────────────────┐              ┌─────────────────────────┐
│  Selemene Engine     │              │  Raycast API            │
│  (visual reference)  │              │  (Color.Raw, Dynamic)   │
│                      │              │                          │
│  Urania 137 palette  │              │  Custom hex colors       │
│  Sacred geometry     │              │  Light/dark variants     │
│  Node states         │              │  tintColor support       │
└──────────────────────┘              └─────────────────────────┘
```

### Data/Control Flow

1. **Design Token Flow**:
   - `design-tokens.ts` defines Urania 137 palette (Sacred Gold, Witness Violet, Flow Indigo, Coherence Emerald, Void Black, Parchment)
   - Exports `Color.Dynamic` variants for light/dark theme support
   - Provides semantic aliases (COLOR_SUCCESS, COLOR_WARNING, COLOR_ERROR, etc.)
   - Exports icon tinting helpers and markdown helpers

2. **Component Flow**:
   - Each component imports from `design-tokens.ts`
   - Uses `COLOR_*` constants instead of `Color.*` enum
   - Applies Urania 137 palette via `tintColor` prop
   - Uses markdown helpers for cosmic headers and sacred geometry

3. **Formatter Flow**:
   - `formatters.ts` imports from `design-tokens.ts`
   - `getHealthColor()`, `getCacheColor()`, `getPhaseColor()` return Urania 137 colors
   - All color functions return `string` (valid as `Color.Raw`)

## 2. DEEP PASS (3 Layers)

### Layer 1: UI/Settings

**Current State:**
- All components use Raycast `Color` enum (Green, Blue, Orange, Magenta, Red, Yellow, SecondaryText)
- Default Raycast styling with no sacred-tech aesthetic
- No design token module

**Target State:**
- All components use `COLOR_*` constants from `design-tokens.ts`
- Urania 137 palette applied consistently
- Sacred geometry framing on gate screens
- Orbital node styling on dashboard
- Gold-accented menu items

**Key Decisions:**
- Keep API auth flow unchanged (bearer token to selemene-gw)
- Use `Color.Raw` (hex strings) for custom colors
- Use `Color.Dynamic` for light/dark theme support
- Create single source of truth in `design-tokens.ts`

### Layer 2: Routing/Combos

**Color Mapping Strategy:**
- `Color.Green` → `COLOR_SUCCESS` (Coherence Emerald `#10B5A7`)
- `Color.Blue` → `COLOR_INFO` (Flow Indigo `#0B50FB`)
- `Color.Orange` → `COLOR_WARNING` (Sacred Gold `#C5A017`)
- `Color.Magenta` → `COLOR_SELECTED` (Witness Violet `#2D0050`)
- `Color.Red` → `COLOR_ERROR` (preserved for errors)
- `Color.Yellow` → `COLOR_WARNING` (Sacred Gold)
- `Color.SecondaryText` → `COLOR_SECONDARY` (muted `#8B8B8B`)

**Raycast Capabilities:**
- `Color.Raw`: Custom hex strings (e.g., `"#C5A017"`)
- `Color.Dynamic`: Light/dark variants with `adjustContrast` option
- `tintColor`: Applies to icons, accessories, tags
- `Detail.Metadata`: Structured panels for sacred geometry

### Layer 3: PAI/Agent Workflow

**Migration Strategy:**
- Phase 1: Create design tokens module (COMPLETED)
- Phase 2: Update formatters to use Urania 137 palette (COMPLETED)
- Phase 3: Migrate all Color enum references to design tokens (COMPLETED)
- Phase 4: Redesign onboarding form with cosmic aesthetic (PENDING)
- Phase 5: Redesign dashboard with orbital node styling (PENDING)
- Phase 6: Redesign remaining components (PENDING)

**Breaking Changes:**
- None — all changes are visual, API flow preserved

**Non-Breaking:**
- All API calls unchanged
- All data fetching unchanged
- All business logic unchanged
- All tests unchanged (except color assertions)

## 3. TASK GRAPH

| ID | Task | Acceptance Criteria | Combo Hint | Skill Gap |
|----|------|---------------------|------------|-----------|
| T1 | **Create design tokens module** | `src/lib/design-tokens.ts` exports Urania 137 palette, Color.Dynamic variants, semantic aliases, icon helpers, markdown helpers | te-build | None |
| T2 | **Update formatters to use Urania 137 palette** | `getHealthColor()`, `getCacheColor()`, `getPhaseColor()` return COLOR_* constants | te-build | None |
| T3 | **Migrate all Color enum references** | `grep -r "Color\." src/` returns zero matches, all components use COLOR_* | te-build | None |
| T4 | **Redesign onboarding form** | `src/components/onboarding-form.tsx` uses cosmic aesthetic with gold accents | te-build | None |
| T5 | **Redesign access gate** | `src/components/access-gate.tsx` uses sacred geometry framing | te-build | None |
| T6 | **Redesign dashboard** | `src/dashboard.tsx` uses orbital node styling, Urania 137 palette | te-build | None |
| T7 | **Redesign menu bar** | `src/menubar.tsx` uses gold-accented items | te-build | None |
| T8 | **Redesign developer tools** | `src/developer-tools.tsx` uses cosmic diagnostic panels | te-build | None |
| T9 | **Redesign daily ritual** | `src/components/daily-ritual-command.tsx` uses sacred geometry loading states | te-build | None |
| T10 | **Redesign profile form** | `src/components/profile-form.tsx` uses cosmic birth data entry | te-build | None |
| T11 | **Redesign execution forms** | `src/components/execution-forms.tsx` uses gold/emerald action styling | te-build | None |
| T12 | **Redesign browsers** | `src/components/noesis-browsers.tsx` uses orbital node browsing | te-build | None |
| T13 | **Redesign actions** | `src/components/noesis-actions.tsx` uses Urania 137 styling | te-build | None |
| T14 | **Verify all tests pass** | `npm test` passes (76 tests across 13 files) | te-validate | None |
| T15 | **Verify TypeScript compiles** | `npm run build` passes with no type errors | te-validate | None |
| T16 | **Update README and QUICKSTART** | Document Urania 137 design system integration | te-reason | None |

## 4. HANDOFF

### SWARM Tasks (te-swarm-s)
- T1, T2, T3 — Design token creation and migration (COMPLETED)
- T14, T15, T16 — Verification and documentation

### PAID Tasks (te-dispatch-paid)
- T4, T5, T6, T7, T8, T9, T10, T11, T12, T13 — Component redesigns

### HUMAN Tasks
- None — all tasks can be automated

## 5. OPEN QUESTIONS

1. **Sacred geometry assets**: Should we create custom SVG assets for sacred geometry patterns?
2. **Animation**: Should we add subtle animations for node states (active, focus, selected)?
3. **Accessibility**: Should we ensure high contrast ratios for Urania 137 palette?
4. **Theme support**: Should we create explicit light/dark theme variants for all colors?
