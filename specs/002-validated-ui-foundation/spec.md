# Feature Specification: Validated UI Foundation

**Roadmap input**: `ROADMAP.md` → `UI-BASE-001`  
**Status**: planned-after-DATA-001  
**Created**: 2026-08-11

## Intent

Port the approved `design-proposition/app` experience into the autonomous repository before production system calculations are integrated. Preserve the validated design while removing every dependency on simulated calculations, fixture results, duplicated domain contracts, and parent-repository runtime files.

## Functional requirements

- **FR-UIBASE-001**: Port the approved application shell, routing, navigation, design tokens, typography, responsive layout, command palette, dialogs, status presentation, and reusable UI components.
- **FR-UIBASE-002**: Port project, home, catalog, settings, workshop, and dossier route structure without introducing production calculations.
- **FR-UIBASE-003**: Replace every simulated result with a truthful unavailable, empty, loading, stale, warning, or error state backed by explicit application contracts.
- **FR-UIBASE-004**: Remove `MockEngine`, `ENGINE_IS_SIMULATED`, render-time engine calls, fixture-as-result behavior, and prototype-only domain/store duplication.
- **FR-UIBASE-005**: Consume canonical contracts from workspace packages and expose one application port for future immutable calculation runs.
- **FR-UIBASE-006**: Keep appearance and interaction behavior aligned with the approved design unless a documented accessibility, responsiveness, or truthfulness correction is necessary.
- **FR-UIBASE-007**: Add route, keyboard, accessibility, responsive, E2E, and reviewed visual-regression evidence.
- **FR-UIBASE-008**: Produce a source-to-target adoption inventory and an explicit list of intentional differences.

## Out of scope

- AIO, grid, diesel, pumping, street-lighting, cable, protection, reliability, or financial formulas.
- Tauri packaging, persistence implementation, cloud synchronization, or live weather downloads.
- Visual redesign, new branding, or speculative UX flows.

## Acceptance criteria

- The approved shell and routes run from this repository with no parent dependency.
- Production bundles contain no simulated calculation implementation or fixture result path.
- Every unavailable calculation is visibly and accessibly unavailable.
- `pnpm verify`, `$ksd-ui-acceptance`, and `$speckit-converge` pass.
- Visual changes relative to the approved baseline are either absent or explicitly documented and approved.

