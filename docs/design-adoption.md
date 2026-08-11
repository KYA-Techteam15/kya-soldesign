# Validated design adoption

The approved design currently lives in `../design-proposition/app`. It is the visual and interaction reference for `UI-001`.

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

Port components by feature after their production contracts exist. Preserve approved appearance unless accessibility, responsiveness, or truthful-state requirements demand a change. Any intentional visible change must be documented in the active spec.

