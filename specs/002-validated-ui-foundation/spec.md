# Feature Specification: Validated UI Foundation

**Feature Branch**: `002-validated-ui-foundation`
**Roadmap input**: `ROADMAP.md` → `UI-BASE-001`
**Created**: 2026-08-11
**Status**: ready-for-implementation

## Intent

Port the approved `design-proposition/app` experience into the autonomous repository before production system calculations are integrated. Preserve the validated design while removing every dependency on simulated calculations, fixture results, duplicated domain contracts, and parent-repository runtime files.

The visual authority is the application rendered from source revision `1be343f814abc6379517389c42e484806634e6bb`, in light theme and `sober` visual mode. Fresh 1440 × 1000 captures are stored under `reference-captures/`; the older `../design-proposition/app/shots/` files are explicitly not acceptance baselines.

## User Scenarios & Testing

### User Story 1 — Enter the autonomous workspace (Priority: P1)

As a KYA photovoltaic engineer, I can open KYA SolDesign Next, understand which system families are available, create an AIO study draft, resume an in-session draft, and move through the approved application shell without seeing invented results.

**Why this priority**: Every later calculation feature depends on a stable, trustworthy shell and route model.

**Independent Test**: Start with an empty session, create an AIO project, navigate Home → Projects → Workshop, reload only where the current in-memory boundary permits, and verify that every calculation-dependent area remains explicitly unavailable.

**Acceptance Scenarios**:

1. **Given** an empty application session, **when** the engineer opens Home, **then** the approved shell, six system-family cards, catalog/settings access, and a truthful empty recent-project area are visible.
2. **Given** only the AIO topology is scheduled, **when** system cards are rendered, **then** AIO can create a draft and the other five cards are visibly and accessibly marked unavailable or coming later.
3. **Given** a newly created draft, **when** the engineer follows shell navigation and the eight-step workshop rail, **then** the URL, heading, active step, and keyboard focus move coherently.
4. **Given** no production engine run exists, **when** a calculation-dependent route is opened, **then** no numeric result is shown and an actionable unavailable state names the roadmap capability that is missing.

---

### User Story 2 — Work in French or English (Priority: P1)

As an engineer who works in French or English, I can switch language from the shell and use the complete UI-BASE surface without raw translation keys, mixed-language navigation, or broken layouts.

**Why this priority**: Both languages are mandatory product behavior, not a later cosmetic pass.

**Independent Test**: Run every UI-BASE route in French and English, verify the translation-key sets are identical, and run the visual/text-expansion checks at the reference desktop viewport and supported narrow viewport.

**Acceptance Scenarios**:

1. **Given** a first launch, **when** the UI appears, **then** French is selected by default.
2. **Given** any UI-BASE route, **when** the engineer selects English, **then** all product copy owned by this feature changes without navigation or draft state loss.
3. **Given** a missing translation in development or test, **when** the dictionary is validated, **then** the build/test gate fails rather than silently shipping a key or French fallback.

---

### User Story 3 — Browse canonical inputs without confusing them for results (Priority: P2)

As an engineer, I can browse and search the canonical equipment catalog and see clear provenance/quality cues, while result selection and compatibility remain unavailable until their owning calculation features exist.

**Why this priority**: DATA-001 is complete and the UI must consume its contracts without reintroducing prototype reference arrays.

**Independent Test**: Open the catalog with the checked-in canonical snapshot, filter by supported equipment kind and text, inspect provenance, then simulate a catalog-load failure and verify the accessible error state.

**Acceptance Scenarios**:

1. **Given** canonical catalog data, **when** the catalog route opens, **then** it renders only records accepted by `@ksd/catalog` contracts and shows their source identity.
2. **Given** a search or kind filter, **when** it is applied, **then** the list changes deterministically and an empty result is distinguished from a loading or load-error state.
3. **Given** no equipment compatibility engine, **when** the engineer opens the material workshop step, **then** no recommended quantity or compatible-equipment claim is displayed.

---

### User Story 4 — Recognize every truthful UI state (Priority: P2)

As an engineer, I can distinguish empty, unavailable, loading, error, stale, warning, and ready states through text and semantics, not color alone.

**Why this priority**: The validated prototype contains simulated result paths; replacing them truthfully is a constitutional requirement.

**Independent Test**: Render the state primitives from typed test-only scenarios and verify labels, roles, focus behavior, color independence, and absence of numeric result fields for unavailable/stale states.

**Acceptance Scenarios**:

1. **Given** a capability has no production implementation, **when** its panel renders, **then** status is `unavailable`, its reason and next roadmap owner are named, and the action that would fabricate a result is disabled.
2. **Given** an application-port error, **when** it is displayed, **then** the user gets a localized summary and a safe retry/navigation action without internal stack data.
3. **Given** test-only ready or stale scenarios, **when** visual components render, **then** the UI requires a typed evidence reference and never derives readiness from a timestamp alone.

---

### User Story 5 — Use the workspace with keyboard and constrained space (Priority: P3)

As an engineer, I can operate primary navigation, dialogs, the command palette, and workshop controls by keyboard, and I can still use the interface when the desktop window narrows or text expands.

**Why this priority**: Accessibility and resilient desktop layouts are part of the validated UX contract.

**Independent Test**: Execute keyboard-only Playwright journeys, automated accessibility checks, reduced-motion checks, and visual snapshots at 1440 × 1000 and 1024 × 768 plus one 200% text-expansion case.

**Acceptance Scenarios**:

1. **Given** keyboard-only input, **when** the user opens and closes the command palette or confirmation dialog, **then** focus is trapped/restored correctly and Escape behaves consistently.
2. **Given** 1024 × 768, **when** workshop content is opened, **then** navigation and primary actions remain reachable without document-level horizontal scrolling.
3. **Given** reduced-motion preference, **when** the UI changes state, **then** nonessential motion is removed.

### Edge Cases

- The project list and recent-project region contain zero items.
- A route references an unknown project id or an unsupported workshop segment.
- Canonical catalog loading fails validation or returns zero matching records.
- A language switch occurs while a dialog is open or a draft contains unsaved in-memory edits.
- English copy is longer than its French counterpart and the viewport is 1024 × 768.
- Browser storage contains prototype keys such as `ksd-ui` or `ksd-projects`; the new app must ignore them.
- A future calculation adapter is absent, throws, or returns an unsupported schema version.
- A visual test scenario contains data that accidentally becomes reachable from the production entry point.

## Requirements

### Functional Requirements

- **FR-UIBASE-001**: The application MUST port the approved shell, Home, Projects, Catalog, Settings, eight-step Workshop navigation, command palette, confirmation dialog, toast region, status presentation, and reusable field/dialog/flow primitives.
- **FR-UIBASE-002**: The implementation MUST preserve the information architecture, visual hierarchy, dark-blue typography, KYA orange/green accents, spacing, typography, density, and primary interactions of source revision `1be343f...` in light/`sober` mode.
- **FR-UIBASE-003**: The production entry point MUST contain no `MockEngine`, `SizingEngine`, `ENGINE_IS_SIMULATED`, prototype fixtures, simulated computation, random result, or parent-relative runtime import.
- **FR-UIBASE-004**: Every calculation-dependent surface MUST render a typed truthful state: `empty`, `unavailable`, `loading`, `error`, `stale`, or `ready`; only `ready` with immutable calculation evidence may expose result values.
- **FR-UIBASE-005**: For UI-BASE-001, the production calculation capability MUST be `unavailable`; test-only `ready`/`stale` scenarios MUST be isolated from production bundles.
- **FR-UIBASE-006**: Project drafts MUST use `@ksd/project-format`; equipment, locality, load, weather, units, and calculation envelopes MUST use workspace package exports instead of duplicated UI contracts.
- **FR-UIBASE-007**: The application MUST use a single typed application-port boundary for current project/session access, canonical catalog access, and future immutable calculation runs. React components MUST NOT read JSON files directly or call an engine directly.
- **FR-UIBASE-008**: Persistence, database selection, Tauri APIs, cloud sync, and live weather download MUST NOT be implemented. The UI MUST describe session-only behavior truthfully.
- **FR-UIBASE-009**: French (`fr`) MUST be the default locale and French/English message catalogs MUST have identical typed key sets for every UI-BASE surface.
- **FR-UIBASE-010**: Missing translations MUST fail static or automated checks; production rendering MUST NOT silently expose raw keys or rely on French fallback for an English UI-BASE key.
- **FR-UIBASE-011**: The canonical equipment catalog MUST be browsable and searchable from `@ksd/catalog` data with source/provenance cues; compatibility, quantities, and recommendations MUST remain unavailable.
- **FR-UIBASE-012**: The six validated system-family cards MUST remain visible. Only functionality actually scheduled and supported may be enabled; disabled cards MUST remain keyboard-readable and explain their status.
- **FR-UIBASE-013**: Unknown project and route states MUST recover to an explicit localized not-found/empty state without creating implicit data.
- **FR-UIBASE-014**: Dialogs, palette, notifications, status, tabs, forms, and navigation MUST meet keyboard, focus, labeling, status-announcement, contrast, and non-color-only requirements.
- **FR-UIBASE-015**: The interface MUST remain usable at 1440 × 1000 and 1024 × 768 and under 200% text expansion. Mobile product behavior is not required in this feature.
- **FR-UIBASE-016**: Visual regression MUST use the fresh local captures in `reference-captures/` and an explicit difference ledger. Older `design-proposition/app/shots` images MUST NOT be used as golden baselines.
- **FR-UIBASE-017**: Production source and output MUST pass automated forbidden-pattern checks for parent paths, mock/simulated engines, prototype fixture imports, and test-only scenario imports.
- **FR-UIBASE-018**: Every task phase MUST run the relevant KSD UI audit and `pnpm verify:phase`; completion requires `pnpm verify`, reviewed visual evidence, and Spec Kit convergence.

### Key Entities

- **UiLocale**: `fr | en`, with French default and a total message catalog for each locale.
- **UiTheme**: approved light/dark preference; `sober` is the only production visual mode in this feature.
- **StudyDraft**: an in-memory `ProjectFileV1` value owned by the application port; no durable persistence in UI-BASE-001.
- **CapabilityState**: discriminated union describing `empty`, `unavailable`, `loading`, `error`, `stale`, or `ready` and the evidence required for each state.
- **CalculationEvidenceRef**: engine version, input hash, run id/version, issue summary, and trace availability needed before a result can be called ready.
- **CatalogViewItem**: presentation projection of a validated `@ksd/catalog` equipment record including provenance, never a compatibility claim.
- **IntentionalDifference**: source route/component, observed baseline, target behavior, reason (`truthfulness`, `accessibility`, `responsiveness`, or `architecture`), and approval requirement.

## Success Criteria

### Measurable Outcomes

- **SC-UIBASE-001**: A keyboard-only user can complete Home → create AIO draft → visit all eight workshop steps → return Home without a focus trap or navigation failure.
- **SC-UIBASE-002**: All UI-BASE routes pass in both locales with zero missing keys, zero raw keys, and zero mixed-language shell labels.
- **SC-UIBASE-003**: Automated production-boundary scans find zero parent-relative imports, zero prototype fixture imports, and zero simulated/mock calculation identifiers.
- **SC-UIBASE-004**: Every calculation-dependent route has automated evidence that unavailable state contains zero rendered engineering/financial result values.
- **SC-UIBASE-005**: Reviewed comparisons at 1440 × 1000 find no undocumented change to shell geometry, workshop hierarchy, dark-blue typography, KYA accents, spacing, or interaction priority.
- **SC-UIBASE-006**: Primary routes have no serious or critical automated accessibility violations, remain usable at 1024 × 768, and pass the 200% text-expansion scenario.
- **SC-UIBASE-007**: `pnpm verify:phase` is green after every phase; final `pnpm verify`, `$ksd-ui-acceptance`, and `$speckit-converge` are green.

## Assumptions

- The validated design authority is source revision `1be343f814abc6379517389c42e484806634e6bb`, light theme, `sober` mode, not the old shot export directory.
- The primary production viewport is desktop; formal desktop packaging and offline persistence remain owned by `DESK-001`.
- French is implemented first within each slice, but a slice is not complete until its English catalog and tests are complete.
- AIO project creation may create a session-only blank `ProjectFileV1`; it does not imply that AIO calculations exist.
- Test-only visual scenarios may use deterministic sample content when isolated from production import graphs and visibly labelled in their harness.

## Out of Scope

- AIO, grid, diesel, pumping, street-lighting, cable, protection, reliability, or financial formulas.
- A database, durable local persistence, Tauri packaging, cloud synchronization, or live weather downloads.
- Production result cards populated with prototype values.
- Porting `vivid` or `radiant` visual experiments.
- A redesign, new branding, mobile-first navigation, or speculative workflows.
