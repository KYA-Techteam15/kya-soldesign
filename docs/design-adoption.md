# Validated design adoption

The approved design currently lives in `../design-proposition/app` at revision `1be343f814abc6379517389c42e484806634e6bb`. Its light-theme `sober` rendering is the visual and interaction baseline for `UI-BASE-001` and every later system integration. Fresh audited captures live under `specs/002-validated-ui-foundation/reference-captures/`; the older parent `shots/` exports are not acceptance baselines.

## Adopt

- information architecture and workshop navigation;
- design tokens, typography, spacing, and validated responsive behavior;
- project, site, needs, equipment, protection, costing, and dossier screen intent;
- empty, warning, progress, and verdict presentation patterns where they remain truthful.

## Do not copy

- `src/engine/MockEngine.ts`;
- render-time calls to the synchronous mock engine;
- `ENGINE_IS_SIMULATED` production behavior;
- duplicated domain types that conflict with canonical packages;
- fixture values displayed as if they were calculated;
- result state based only on `recalculatedAt` rather than an immutable calculation run.

## Adoption rule

`UI-BASE-001` ports the application shell, navigation, design tokens, reusable components, non-calculated screens, and truthful unavailable states before `AIO-001` begins. Later UI features connect production calculation envelopes into that foundation system by system.

Preserve the approved information architecture, visual hierarchy, spacing, typography, and interactions. Accessibility, responsiveness, and truthful-state corrections are allowed only when documented. Any other intentional visible change requires an explicit spec decision.

The temporary foundation screen in `apps/desktop` is not a competing design. It exists only to prove the autonomous build and must be replaced during `UI-BASE-001`.

## Autonomous integration baseline

Commit `9e945de` is the first autonomous direct-copy integration baseline. It is
the visual and interaction authority for the model-convergence work that follows.
Its copied prototype models, fixtures, reference JSON, stores, and mock engine are
temporary migration inputs, not approved production architecture. They must be
replaced behind the preserved interface according to
`specs/002-validated-ui-foundation/contracts/model-convergence.md`.

## Required acceptance evidence

- route and component inventory mapped from the approved source to the new application;
- Playwright coverage for primary navigation and truthful empty/error states;
- reviewed visual comparisons at fixed viewport/environment;
- confirmation that no file under the new UI imports the legacy project, `MockEngine`, or parent data;
- documented list of every intentional visual or interaction difference.
