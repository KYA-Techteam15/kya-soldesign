# Research: Validated UI Foundation

## Decision 1 — Visual authority

**Decision**: Use `../design-proposition/app` at commit `1be343f814abc6379517389c42e484806634e6bb`, rendered with `theme=light` and `vibe=sober`, as the UI authority. Use the fresh 1440 × 1000 captures under `reference-captures/` for review.

**Rationale**: The application was launched and inspected on 2026-08-11. The live rendering contains the approved dark-blue typography, KYA orange/green accents, dense desktop workshop, and latest system schematics. The checked-in `shots/` exports were rejected by the product owner as stale.

**Rejected alternatives**:

- `design-proposition/app/shots/`: stale and explicitly rejected.
- `vivid`: experimental dark chrome; not the validated direction.
- `radiant`: experimental and incomplete on the current Home route.
- The temporary `apps/desktop` foundation screen: build proof only, not a design candidate.

## Decision 2 — Faithful port, not source copy

**Decision**: Port visual tokens, route intent, shell composition, interaction hierarchy, and reusable component behavior. Reimplement them inside the autonomous app structure.

**Rationale**: Direct copying would bring prototype domain types, fixture data, and simulated engine coupling into the new runtime. A controlled port preserves the product while enforcing new ownership boundaries.

**Rejected alternative**: Importing or symlinking the parent prototype. This breaks repository autonomy and the constitution.

## Decision 3 — Production state begins empty

**Decision**: The project collection starts empty. Creating an AIO project creates an in-memory blank `ProjectFileV1`; there are no seeded recent projects in production.

**Rationale**: Prototype projects and result values are presentation fixtures, not user or calculation truth. Durable storage belongs to `DESK-001`.

**Rejected alternatives**:

- Shipping the Bombouaka and Dapaong fixtures: misleading production state.
- Choosing a database now: premature and outside UI-BASE scope.
- Reusing the prototype localStorage keys: implicit, unversioned migration.

## Decision 4 — Application ports isolate React

**Decision**: React consumes a typed `ApplicationServices` boundary with project-session, catalog, and calculation-capability ports. The default UI-BASE adapter is in-memory for drafts, canonical for catalog reads, and explicitly unavailable for calculations.

**Rationale**: This prevents direct JSON reads, engine calls, browser-storage coupling, and future Tauri concerns from leaking into components. It also lets visual and E2E tests provide deterministic adapters without production fixtures.

**Rejected alternatives**:

- A monolithic global Zustand store mirroring the prototype: combines preferences, domain state, run state, timers, and dialogs.
- A new cross-workspace application package: there is only one consumer today, so extraction would be speculative.

## Decision 5 — State ownership

**Decision**: Keep only cross-route session state in an application provider/reducer. Keep ephemeral component state local. Calculation evidence is immutable and separate from editable draft input.

**Rationale**: It removes `savedAt`, `recalculatedAt`, `lastComputeMs`, run timestamps, fixture seeding, and generic mutation callbacks that previously blurred ownership.

**Retained preference state**: locale, theme, palette/dialog state, and only the minimum navigation/session identity needed by the app.

## Decision 6 — Multilingual from the first slice

**Decision**: French is default, but every UI-BASE message is delivered in both French and English in the same phase. Use a typed message-key catalog and a completeness test; missing keys fail tests.

**Rationale**: Both languages are mandatory. Delaying the English structure would cause layout and hard-coded-copy debt. Implementing French first within a task remains compatible with finishing the English catalog before its phase gate.

**Rejected alternative**: Runtime fallback to French. It hides missing English content and allows mixed-language screens.

## Decision 7 — Visual testing without production fiction

**Decision**: Visual tests may use deterministic scenario builders located under test/support paths and injected through the application-port boundary. Production entry points must not import them.

**Rationale**: Stable component states are required to compare layout, but test data must never become a product result. A forbidden-import test protects the boundary.

**Rejected alternative**: Keeping prototype fixtures behind an environment flag. Bundled dormant fixtures still create an unsafe production path.

## Decision 8 — Truthful calculation-state model

**Decision**: Use a discriminated `CapabilityState<T>` union. Only `ready` can contain a `CalculationEnvelope<T>` plus immutable run identity. `stale` references prior evidence but must not present it as current. UI-BASE production adapters return `unavailable`.

**Rationale**: A timestamp such as `recalculatedAt` cannot prove correspondence between input and output. The existing calculation envelope already supplies engine version, input hash, issues, and trace.

## Decision 9 — Supported viewport and accessibility scope

**Decision**: Preserve the dense desktop design at 1440 × 1000 and support a constrained 1024 × 768 desktop window plus 200% text expansion. Mobile-specific product navigation is deferred.

**Rationale**: The confirmed users work primarily on desktop. Accessibility, keyboard use, and narrow-window resilience are mandatory now; inventing a mobile information architecture is not.

## Decision 10 — Styling strategy

**Decision**: Port the validated token vocabulary into layered CSS: foundations/tokens, shell/layout, components, feature styles, print. Ship `sober` only; light and dark themes may use the same semantic tokens.

**Rationale**: It preserves the design while removing competing experimental styles and reduces global-selector collisions.

## Known Corrections to the Prototype

These changes are required and do not constitute a redesign:

1. Remove simulated calculation status and timing from the status bar.
2. Replace seeded project/result content with empty or unavailable states.
3. Remove visual-mode cycling (`sober`/`vivid`/`radiant`).
4. Complete bilingual coverage and remove hard-coded French from UI-BASE surfaces.
5. Repair semantics/focus where the prototype uses generic clickable containers.
6. Prevent page-level horizontal scrolling at the supported 1024 × 768 viewport.
7. Isolate all visual scenario data from the production import graph.

## Open Decisions

None for UI-BASE-001. Database selection, durable persistence, formal offline behavior, and Tauri integration remain deliberately deferred to `DESK-001`.
