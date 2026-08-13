# Tâches — AIO Core

## Phase 1: Fondations contractuelles

- [ ] T001 [P] Étendre uniquement `packages/domain/src/units.ts` avec ratio, Ah, jours et irradiation, puis composer les schémas stricts existants dans `packages/domain/src/aio.ts` (FR-001, FR-009).
- [ ] T002 [P] Écrire les tests de validation/canonicalisation dans `packages/domain/src/__tests__/aio.test.ts` (FR-001, FR-007).
- [ ] T003 Créer la spécialisation AIO de `CalculationRequest`, `CalculationEngine`, `CalculationEnvelope` et `CalculationTraceEntry` selon `contracts/engine-api.md` dans `packages/engine/src/aio/contracts.ts` (FR-009, FR-010).
- [ ] T004 Créer le hash stable des seules entrées techniques dans `packages/engine/src/aio/inputHash.ts` avec tests déterministes (FR-009).

## Phase 2: Calculs test-first

- [ ] T005 [P] Écrire U-001/B-001/P-001/G-001 avant code dans `packages/engine/src/aio/__tests__/load.test.ts` (FR-002).
- [ ] T006 [P] Écrire U-002..U-004, frontières, propriétés et goldens revus dans `packages/engine/src/aio/__tests__/energy-pv.test.ts` (FR-003, FR-004).
- [ ] T007 [P] Écrire U-005..U-007, frontières, propriétés et goldens revus dans `packages/engine/src/aio/__tests__/storage-inverter.test.ts` (FR-005, FR-006).
- [ ] T008 Implémenter `CALC-AIO-001` dans `packages/engine/src/aio/calculations/load.ts` après T005 (FR-002).
- [ ] T009 Implémenter `CALC-AIO-002` à `CALC-AIO-004` dans `packages/engine/src/aio/calculations/energy-pv.ts` après T006 (FR-003, FR-004).
- [ ] T010 Implémenter `CALC-AIO-005` à `CALC-AIO-007` dans `packages/engine/src/aio/calculations/storage-inverter.ts` après T007 (FR-005, FR-006).

## Phase 3: Orchestration et traçabilité

- [ ] T011 Implémenter contraintes par sortie, warnings et traces formule/source dans `packages/engine/src/aio/engine.ts` (FR-007, FR-010).
- [ ] T012 Ajouter tests d'enveloppe, provenance, version et absence de défauts dans `packages/engine/src/aio/__tests__/engine.test.ts` (FR-007, FR-009).
- [ ] T013 Exporter uniquement l'API approuvée dans `packages/engine/src/index.ts` et `packages/engine/src/aio/index.ts` (FR-009).

## Phase 4: Assurance scientifique

- [ ] T014 Ajouter jeux golden revus avec calcul manuel et sources dans `packages/engine/src/aio/__tests__/fixtures/aio-golden-v1.json` (FR-010).
- [ ] T015 Ajouter tests de sensibilité/mutation (η, PR, PSH, autonomie, DoD) dans `packages/engine/src/aio/__tests__/sensitivity.test.ts` (FR-003 à FR-006).
- [ ] T016 Ajouter comparaisons legacy non normatives et écarts attendus dans `packages/engine/src/aio/__tests__/legacy-comparison.test.ts` (FR-010).
- [ ] T017 Ajouter test d'interdiction de sorties SIM/EQP/SAFE/FIN/DOC dans `packages/engine/src/aio/__tests__/scope.test.ts` (FR-008).

## Phase 5: Gates et convergence

- [ ] T018 Exécuter `$ksd-calculation-test`, `$ksd-spec-audit` et `pnpm verify:phase`; corriger au maximum trois itérations dans le périmètre AIO.
- [ ] T019 Exécuter `pnpm verify`, puis `$speckit-converge`; traiter seulement les tâches de convergence de cette feature.
- [ ] T020 Mettre à jour `specs/003-aio-core/convergence.md` avec les commandes, sorties, hash des goldens et résultat final vert.

## Dépendances

`T001-T004 → T005-T010 → T011-T013 → T014-T017 → T018-T020`.

Les tâches marquées `[P]` sont parallélisables uniquement après que leurs prérequis de contrat sont disponibles. Aucun lot ne modifie `apps/desktop`, `ROADMAP.md`, les dossiers parents ou le code legacy.
