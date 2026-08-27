# Roadmap: KYA SolDesign Next

The product is decomposed into bounded vertical slices. IDs are immutable once referenced by a sub-spec.

**Status legend**: planned · in-progress · done

| ID | Sub-feature | Intent | Scope boundary | Depends on | Status | Sub-spec |
|---|---|---|---|---|---|---|
| FND-001 | Autonomous foundation | Establish contracts, repository boundaries, quality gates, and truthful empty UI | No production sizing formula | — | done | Foundation files in repository root |
| DATA-001 | Canonical input data | Version load, weather, locality, and equipment schemas with provenance | No system sizing | FND-001 | done | `specs/001-canonical-input-data/` |
| UI-BASE-001 | Validated UI foundation | Port the approved application shell, navigation, tokens, components, and truthful empty states | No production calculation and no redesign | DATA-001 | done | `specs/002-validated-ui-foundation/` |
| AIO-001 | Standalone AIO core | Deliver a trustworthy standalone all-in-one calculation core against canonical contracts | No controller/inverter split topology | DATA-001, UI-BASE-001 | done | `specs/003-aio-core/` |
| UI-AIO-001 | AIO design integration | Connect the real AIO calculation run to the approved workshop and dossier experience | No new formula in React and no redesign | AIO-001, UI-BASE-001 | in-progress | `specs/004-aio-ui-integration/` |
| PAGE1-001 | Page 1 AIO convergence | Finish Site/Météo and Besoins as one persistent, calculable, recoverable user journey | No progression to Page 2 while a visible field, tab, route, or result is incomplete | UI-AIO-001 | done | `specs/005-page1-convergence/` |
| APP-001 | Application experience completion | Complete home, settings, project recovery/transfer, catalog usability, report readiness, and truthful operational metadata | No new system topology, scientific formula, cloud sync, or simulated external service | UI-BASE-001, DATA-001, PAGE1-001 | planned | `specs/007-application-experience-completion/` |
| SIM-001 | Hourly reliability | Simulate hourly energy balance, autonomy, unmet load, clipping, and storage state | No financial optimization | AIO-001 | planned | — |
| EQP-001 | Equipment compatibility | Select and verify real modules, batteries, and all-in-one inverters | No protection sizing | AIO-001, DATA-001 | planned | — |
| SAFE-001 | Cables and protections | Size conductors and protections from sourced electrical rules | No single-line document rendering | EQP-001 | planned | — |
| FIN-001 | Lifecycle economics | Compute versioned costs, replacements, cash flows, LCOE, and financial outputs | No commercial document layout | SIM-001, EQP-001 | planned | — |
| DOC-001 | Engineering dossier | Generate synthesis, report, synoptic, and export artifacts | No new engineering formulas | SAFE-001, FIN-001 | planned | — |
| DESK-001 | Tauri desktop package | Add local persistence, worker hosting, installers, and platform integration | No cloud synchronization | UI-AIO-001 | planned | — |
| CTRL-001 | Standalone controller/inverter | Support separated charge controller and inverter topology | No grid interaction | SIM-001, EQP-001 | planned | — |
| GRID-001 | Grid-tied | Implement grid-connected sizing, production, and constraints | No diesel dispatch | SIM-001, EQP-001 | planned | — |
| DIESEL-001 | PV-diesel hybrid | Implement dispatch and hybrid energy/economic model | No pumping-specific hydraulics | SIM-001, FIN-001 | planned | — |
| PUMP-001 | Solar pumping | Implement hydraulic demand, pump, array, and storage sizing | No street-lighting model | DATA-001 | planned | — |
| LIGHT-001 | Solar street lighting | Implement lighting demand, autonomy, and component sizing | No hydraulic model | DATA-001 | planned | — |

## Ordering rule

Foundation work does not justify building every shared abstraction upfront. The mandatory first sequence is `DATA-001 → UI-BASE-001 → AIO-001 → UI-AIO-001 → PAGE1-001`. `PAGE1-001` is the current exit gate: no Page 2 work starts until Page 1 is complete, persistent, recoverable, tested, and visually validated. This ensures calculations are built on trustworthy data and integrated into the approved design rather than into a temporary replacement interface. Extract shared primitives only after a second consumer proves the abstraction.
