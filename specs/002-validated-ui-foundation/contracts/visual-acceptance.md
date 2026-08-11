# Contract: Visual acceptance

## Authority

- Live source revision: `1be343f814abc6379517389c42e484806634e6bb`.
- Production mode: light theme, `sober` visual vocabulary.
- Fresh capture set: `../reference-captures/*-live.png`.
- Old `design-proposition/app/shots` files are excluded.

## Preserve

- KYA brand lockup and restrained orange/green accents.
- Dark-blue primary typography and muted blue-grey supporting text.
- Pale blue-grey canvas, white panels, fine borders, and compact radii.
- Dense desktop engineering layout and eight-step left rail.
- Strong active-step cue, tab hierarchy, table density, and monospace numeric treatment.
- Clear distinction between input, state, warning, provenance, and action.

## Required intentional differences

| ID | Change | Category | Approval |
|---|---|---|---|
| VD-001 | Seeded recent projects become a truthful empty/session list | truthfulness | Pre-approved by spec |
| VD-002 | Simulated status/timing/offline/database claims are removed | truthfulness | Pre-approved by constitution |
| VD-003 | Result numbers become unavailable-state panels until their roadmap owner lands | truthfulness | Pre-approved by spec |
| VD-004 | `vivid`/`radiant` selection is removed | architecture | Pre-approved by validated `sober` choice |
| VD-005 | Dialog/focus/status semantics may add invisible attributes or visible focus rings | accessibility | Pre-approved if hierarchy is unchanged |
| VD-006 | Narrow-desktop overflow may reflow or scroll inside data regions | responsiveness | Pre-approved if primary actions remain reachable |

Any other visible difference requires an entry with review evidence and, when it changes validated UX behavior, explicit human approval.

## Review ledger — 2026-08-11

| ID | Disposition | Evidence |
|---|---|---|
| VD-001 | Applied as approved | `visual.spec.ts-snapshots/home-fr-1440-chromium-win32.png`; Home exposes only the empty in-memory session. |
| VD-002 | Applied as approved | `tools/ui/check-production-boundaries.mjs` passed; shell/status copy contains no simulated or persistence claim. |
| VD-003 | Applied as approved | `truth-states.spec.ts` passed; workshop captures show roadmap-owned unavailable panels and no rendered result units. |
| VD-004 | Applied as approved | `tokens.css` has only sober light/dark tokens; Impeccable detector returned `[]`. |
| VD-005 | Applied as approved | `accessibility.spec.ts` passed Axe, focus and Escape scenarios. |
| VD-006 | Applied as approved | `responsive.spec.ts` passed at 1024×768, 200% text and reduced motion. |

## Capture matrix

| Surface | State | Locale | Viewport |
|---|---|---|---|
| Home | Empty project collection | FR + EN | 1440×1000, 1024×768 |
| Workshop/Needs | Blank editable draft | FR + EN | 1440×1000, 1024×768 |
| Workshop/Equipment | Catalog available, sizing unavailable | FR + EN | 1440×1000, 1024×768 |
| Workshop/Dossier | Calculation/report capabilities unavailable | FR + EN | 1440×1000, 1024×768 |
| Command palette | Open, keyboard focus | FR + EN | 1440×1000, 1024×768 |
| Dialog | Open confirmation | FR + EN | 1440×1000, 1024×768 |

## Review method

1. Reset scroll position and use deterministic fonts/environment.
2. Compare target captures to the fresh source references for geometry, hierarchy, density, typography, color, and action priority.
3. Do not compare prototype numeric content as expected truth.
4. Record every accepted difference in the ledger.
5. Do not update target baselines merely to silence a visual failure.

**Acceptance result**: accepted on 2026-08-11. The 36-snapshot FR/EN matrix is green at both viewports, Impeccable reports no findings, and the four fresh live captures were reviewed as the visual authority. Prototype numeric content remains intentionally excluded under VD-003.
