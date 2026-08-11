# Roadmap: KYA SolDesign Next

The product is decomposed into bounded vertical slices. IDs are immutable once referenced by a sub-spec.

**Status legend**: planned · in-progress · done

| ID | Sub-feature | Intent | Scope boundary | Depends on | Status | Sub-spec |
|---|---|---|---|---|---|---|
| FND-001 | Autonomous foundation | Establish contracts, repository boundaries, quality gates, and truthful empty UI | No production sizing formula | — | done | Foundation files in repository root |
| DATA-001 | Canonical input data | Version load, weather, locality, and equipment schemas with provenance | No system sizing | FND-001 | planned | `specs/001-canonical-input-data/` |
| AIO-001 | Standalone AIO core | Deliver a trustworthy end-to-end standalone all-in-one calculation slice | No controller/inverter split topology | FND-001, DATA-001 | planned | — |
| SIM-001 | Hourly reliability | Simulate hourly energy balance, autonomy, unmet load, clipping, and storage state | No financial optimization | AIO-001 | planned | — |
| EQP-001 | Equipment compatibility | Select and verify real modules, batteries, and all-in-one inverters | No protection sizing | AIO-001, DATA-001 | planned | — |
| SAFE-001 | Cables and protections | Size conductors and protections from sourced electrical rules | No single-line document rendering | EQP-001 | planned | — |
| FIN-001 | Lifecycle economics | Compute versioned costs, replacements, cash flows, LCOE, and financial outputs | No commercial document layout | SIM-001, EQP-001 | planned | — |
| DOC-001 | Engineering dossier | Generate synthesis, report, synoptic, and export artifacts | No new engineering formulas | SAFE-001, FIN-001 | planned | — |
| UI-001 | Validated design adoption | Port the approved design into the autonomous application against production contracts | No redesign without approval | AIO-001 | planned | — |
| DESK-001 | Tauri desktop package | Add local persistence, worker hosting, installers, and platform integration | No cloud synchronization | UI-001 | planned | — |
| CTRL-001 | Standalone controller/inverter | Support separated charge controller and inverter topology | No grid interaction | SIM-001, EQP-001 | planned | — |
| GRID-001 | Grid-tied | Implement grid-connected sizing, production, and constraints | No diesel dispatch | SIM-001, EQP-001 | planned | — |
| DIESEL-001 | PV-diesel hybrid | Implement dispatch and hybrid energy/economic model | No pumping-specific hydraulics | SIM-001, FIN-001 | planned | — |
| PUMP-001 | Solar pumping | Implement hydraulic demand, pump, array, and storage sizing | No street-lighting model | DATA-001 | planned | — |
| LIGHT-001 | Solar street lighting | Implement lighting demand, autonomy, and component sizing | No hydraulic model | DATA-001 | planned | — |

## Ordering rule

Foundation work does not justify building every shared abstraction upfront. Complete `DATA-001`, then execute `AIO-001` as the first production vertical slice. Extract shared primitives only after a second consumer proves the abstraction.
