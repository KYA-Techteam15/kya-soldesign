# Tâches — AIO Core

## Phase 1: Fondations contractuelles

- [x] T001 [P] Étendre uniquement `packages/domain/src/units.ts` avec ratio, Ah, jours et irradiation, puis composer les schémas stricts existants dans `packages/domain/src/aio.ts` (FR-001, FR-009).
- [x] T002 [P] Écrire les tests de validation/canonicalisation dans `packages/domain/src/__tests__/aio.test.ts` (FR-001, FR-007).
- [x] T003 Créer la spécialisation AIO de `CalculationRequest`, `CalculationEngine`, `CalculationEnvelope` et `CalculationTraceEntry` selon `contracts/engine-api.md` dans `packages/engine/src/aio/contracts.ts` (FR-009, FR-010).
- [x] T004 Créer le hash stable des seules entrées techniques dans `packages/engine/src/aio/inputHash.ts` avec tests déterministes (FR-009).

## Phase 2: Calculs test-first

- [ ] T005 [P] Écrire U-001/B-001/P-001/G-001 avant code dans `packages/engine/src/aio/__tests__/load.test.ts` (FR-002).
- [ ] T006 [P] Écrire U-002..U-004, frontières, propriétés et goldens revus dans `packages/engine/src/aio/__tests__/energy-pv.test.ts` (FR-003, FR-004).
- [ ] T007 [P] Écrire U-005..U-007, frontières, propriétés et goldens revus dans `packages/engine/src/aio/__tests__/storage-inverter.test.ts` (FR-005, FR-006).
- [x] T008 Implémenter `CALC-AIO-001` dans `packages/engine/src/aio/calculations/load.ts` après T005 (FR-002).
- [x] T009 Implémenter `CALC-AIO-002` à `CALC-AIO-004` dans `packages/engine/src/aio/calculations/energy-pv.ts` après T006 (FR-003, FR-004).
- [x] T010 Implémenter `CALC-AIO-005` à `CALC-AIO-007` dans `packages/engine/src/aio/calculations/storage-inverter.ts` après T007 (FR-005, FR-006).

## Phase 3: Orchestration et traçabilité

- [x] T011 Implémenter contraintes par sortie, warnings et traces formule/source dans `packages/engine/src/aio/engine.ts` (FR-007, FR-010).
- [x] T012 Ajouter tests d'enveloppe, provenance, version et absence de défauts dans `packages/engine/src/aio/__tests__/engine.test.ts` (FR-007, FR-009).
- [x] T013 Exporter uniquement l'API approuvée dans `packages/engine/src/index.ts` et `packages/engine/src/aio/index.ts` (FR-009).

## Phase 4: Assurance scientifique

- [ ] T014 Ajouter jeux golden revus avec calcul manuel et sources dans `packages/engine/src/aio/__tests__/fixtures/aio-golden-v1.json` (FR-010).
- [x] T015 Ajouter tests de sensibilité/mutation (η, PR, PSH, autonomie, DoD) dans `packages/engine/src/aio/__tests__/sensitivity.test.ts` (FR-003 à FR-006).
- [x] T016 Ajouter comparaisons legacy non normatives et écarts attendus dans `packages/engine/src/aio/__tests__/legacy-comparison.test.ts` (FR-010).
- [x] T017 Ajouter test d'interdiction de sorties SIM/EQP/SAFE/FIN/DOC dans `packages/engine/src/aio/__tests__/scope.test.ts` (FR-008).

## Phase 5: Gates et convergence

- [x] T018 Exécuter `$ksd-calculation-test`, `$ksd-spec-audit` et `pnpm verify:phase`; corriger au maximum trois itérations dans le périmètre AIO.
- [x] T019 Exécuter `pnpm verify`, puis `$speckit-converge`; traiter seulement les tâches de convergence de cette feature.
- [x] T020 Mettre à jour `specs/003-aio-core/convergence.md` avec les commandes, sorties, hash des goldens et résultat final; ne déclarer vert que si toutes les preuves, dont le golden humain, existent.

## Dépendances

`T001-T004 → T005-T010 → T011-T013 → T014-T017 → T018-T020`.

Les tâches marquées `[P]` sont parallélisables uniquement après que leurs prérequis de contrat sont disponibles. Aucun lot ne modifie `apps/desktop`, `ROADMAP.md`, les dossiers parents ou le code legacy.

## Phase 6: Convergence

- [ ] T021 Obtenir l'approbation humaine d'au moins un cas golden AIO indépendant (entrées, calcul manuel, sources `SRC-AIO-*`, relecteur et date), puis l'ajouter sans dériver d'une sortie legacy (FR-010, missing).
- [x] T022 Restaurer byte-for-byte le contrat public async `CalculationEngine.calculate` dans `packages/engine/src/engine.ts`; garder `calculateSync` comme extension AIO pure et faire déléguer `AioSizingEngine.calculate` vers ce cœur avec tests de contrat (FR-009, contradicts).
- [x] T023 Remplacer le fallback générique `AIO_INVALID_HOURLY_SERIES` par une classification déterministe des erreurs de frontière et une propagation par dépendance conforme à `contracts/engine-api.md`, incluant série horaire, startup, ressource solaire, hypothèses, contexte technique, provenance et forme non récupérable (FR-007, contradicts).
- [x] T024 Garantir une enveloppe sérialisable sans exception pour `NaN`, `Infinity` et valeurs non canoniques; introduire un identifiant diagnostique distinct du hash technique validé et tester le déterminisme (US1/AC3, US3/AC1, partial).
- [x] T025 Ajouter les tests unitaires et propriétés manquants pour zéro/positif, invalidités par champ, propagation minimale, ordre/déduplication des contraintes, déterminisme complet et unité/hash, sans cocher les exigences `G-*` (Constitution IV, partial).
- [x] T026 Réconcilier les chemins/noms de tests réellement adoptés avec les tâches et le registre, puis produire une matrice FR/US/CALC → test précis; ne cocher T005-T007/T014 qu'après golden humain approuvé (FR-010, partial).
- [x] T027 Exécuter `ksd-calculation-test`, `ksd-spec-audit`, `pnpm verify:phase`, `pnpm verify` et `$speckit-converge`; mettre à jour `convergence.md` avec les preuves exactes et laisser le statut non convergé tant que T021 reste ouvert (Constitution V, partial).
