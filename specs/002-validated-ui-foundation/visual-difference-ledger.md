# Visual difference ledger — UI-BASE-001 model convergence

Baseline: commit `9e945de` and its committed Playwright images.

## Pre-authorized differences

| Surface | Difference | Reason |
| --- | --- | --- |
| Home and status bar | No seeded recent project; in-memory session and unavailable-calculation status | Production no longer imports prototype fixtures or mock calculations. |
| Workshop rail | Canonical catalog counts are 387 modules, 366 batteries, and 81 inverters | Counts come from `@ksd/catalog`; rejected records are not displayed. |
| Needs, pre-sizing, equipment, protections, finance, dossier, verdict | Simulated values are replaced by em dashes and explicit unavailable states | Results are exposed only through `CalculationCapabilityPort`; roadmap owners are AIO-001, SIM-001, EQP-001, SAFE-001, FIN-001, and DOC-001. |
| Site | Weather metadata remains, while hourly/monthly synthetic series are absent | The canonical weather catalog contains provenance and orientation metadata, not an authoritative irradiance series. |

No route, workshop step, typography, spacing, color token, or component geometry was intentionally redesigned.

## Snapshot authority note

The committed `visual.spec.ts` at `9e945de` still targeted the superseded simplified
screen structure (`.work-card`, an accessible dialog role on the command palette,
and obsolete Back/Projects controls). The autonomous interface restored by the
same commit uses `.sheet`, `.palette`, the wordmark, and `Tous les projets →`.
Selectors were corrected so the suite reaches the approved surfaces. Snapshots
were not regenerated: the remaining image failures are the pre-authorized
truth-state and canonical-data differences listed above.

## Manual acceptance matrix

The integrated browser batch covers the home and needs surfaces in French and
English at 1440 × 1000 and 1024 × 768. The 1024 × 768 confirmation reports no
document-level horizontal or vertical overflow; the workshop keeps its designed
internal center-pane scroll. The 1440 × 1000 pass preserves the three-pane
composition and full information density.
