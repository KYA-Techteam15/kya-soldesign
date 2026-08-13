# Spec Kit convergence — UI-BASE-001

**Reviewed**: 2026-08-13

The implementation was audited against `spec.md`, `plan.md`, `tasks.md`, the application-port contract, source inventory, visual contract, and both checklists.

## Result: converged — faithful port recovered

The 2026-08-11 closure was reopened after direct inspection showed material,
undocumented visual differences. UI-BASE-001 has now been rebuilt from the validated
source vocabulary and reviewed source-to-target in the in-app browser. The production
application preserves autonomous contracts and replaces prototype claims/results only
where truthfulness requires it.

- The production import graph is autonomous: `node tools/ui/check-production-boundaries.mjs` passes and the parent repository is not a runtime dependency.
- React consumes app-local session, canonical catalog, and unavailable-only calculation ports; test injection remains outside the production graph.
- French and English catalogs are physically separated and have identical keys (`node tools/ui/check-i18n.mjs`: 125 keys); hard-coded-copy and complete route/draft checks pass.
- All eight workshop steps are dedicated modules; site/weather and loads use canonical workspace contracts, unknown routes are explicit, and every calculation remains roadmap-owned/unavailable.
- Axe, focus trap/restore, keyboard palette, constrained desktop, 200% text, reduced motion, injected catalog error/retry, and the full 36-capture visual matrix pass.
- The difference ledger records only pre-approved truthfulness, architecture, accessibility, and responsive differences reviewed against the four fresh live captures.

T059–T066 are implemented. `corepack pnpm test:visual` passes 12 scenarios/36 reviewed baselines, the 16 E2E journeys pass, and Impeccable reports `[]`. Calculation, durable desktop/offline behavior, and production dossier generation remain correctly owned by future roadmap features.
