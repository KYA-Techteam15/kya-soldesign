# Tasks: Dimensionnement détaillé et sécurité électrique

**Input**: Design documents from `/specs/009-detailed-sizing-safety/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

## Phase 1: Setup et preuves partagées

**Purpose**: Figer les frontières, sources et jeux de référence avant tout calcul de production.

- [ ] T001 Enregistrer les décisions et identifiants de formules de cette tranche dans `tools/calculation-register/detailed-sizing-safety.json`
- [ ] T002 [P] Ajouter les fixtures économiques, catalogue et dimensionnement dans `packages/test-kit/src/fixtures/detailed-sizing.ts`
- [ ] T003 [P] Ajouter les cas de protection validés par tronçon dans `packages/test-kit/src/golden/protection-v1.json`
- [ ] T004 [P] Ajouter les cas de câble et sections normalisées approuvés dans `packages/test-kit/src/golden/cabling-v1.json`
- [ ] T005 Documenter l'approbation humaine des formules, séries et arrondis dans `specs/009-detailed-sizing-safety/checklists/scientific-approval.md`

---

## Phase 2: Fondations bloquantes

**Purpose**: Définir contrats, migration, ports et invalidations communs aux six parcours.

- [ ] T006 Ajouter les schémas économiques, catalogue versionné, sélection, optimisation, protection et câble dans `apps/desktop/src/app/models/projectInputs.ts`
- [ ] T007 Implémenter la lecture V1 et migration vers le format détaillé versionné dans `packages/project-format/src/migrations/detailed-sizing-v2.ts`
- [ ] T008 [P] Ajouter les tests de migration et de conservation des inconnues dans `packages/project-format/test/unit/detailed-sizing-v2.unit.test.ts`
- [ ] T009 Définir le port de catalogue utilisateur transactionnel dans `apps/desktop/src/app/contracts.ts`
- [ ] T010 Définir l'invalidation en cascade prédimensionnement → matériel → protections → câbles dans `apps/desktop/src/app/models/calculationFreshness.ts`
- [ ] T011 [P] Tester les transitions d'obsolescence dans `apps/desktop/test/unit/calculation-freshness.unit.test.ts`
- [ ] T012 Exécuter la porte de fondation depuis `kya-sol-design-next/package.json` avec `pnpm verify:phase` et consigner la preuve dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

**Checkpoint**: Aucun parcours utilisateur ne commence avant la réussite de cette phase.

---

## Phase 3: User Story 1 — Hypothèses économiques (Priority: P1) 🎯 MVP

**Goal**: Permettre une saisie économique claire, notamment prix total + stockage kWh, avec valeur canonique et provenance.

**Independent Test**: 10 kWh et 1 500 000 FCFA produisent 150 000 FCFA/kWh, persistent et se restaurent.

### Tests

- [ ] T013 [P] [US1] Écrire les tests échouants de conversion et d'arrondi monétaire dans `packages/engine/test/unit/economic-assumptions.unit.test.ts`
- [ ] T014 [P] [US1] Écrire le test d'intégration persistance/restauration des hypothèses dans `apps/desktop/test/integration/economic-assumptions.integration.test.ts`

### Implementation

- [ ] T015 [US1] Implémenter la conversion pure du coût de stockage et l'estimation principale dans `packages/engine/src/sizing/economics.ts`
- [ ] T016 [US1] Étendre les contrats économiques et exports dans `packages/engine/src/sizing/contracts.ts`
- [ ] T017 [US1] Créer le modèle de formulaire économique et sa provenance dans `apps/desktop/src/app/models/economicAssumptions.ts`
- [ ] T018 [US1] Réorganiser les groupes PV, stockage, onduleur et environnement dans `apps/desktop/src/routes/workshop/SectionHypotheses.tsx`
- [ ] T019 [US1] Ajouter libellés, aides, erreurs et unités FR/EN dans `apps/desktop/src/i18n/messages.ts`
- [ ] T020 [US1] Ajouter le scénario clavier et rechargement dans `apps/desktop/e2e/detailed-sizing.spec.ts`
- [ ] T021 [US1] Exécuter `pnpm verify:phase` et consigner US1 dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

---

## Phase 4: User Story 2 — Catalogue et filtres (Priority: P1)

**Goal**: Rendre KYA immuable, gérer les références utilisateur versionnées et partager les filtres partout.

**Independent Test**: Dupliquer une référence KYA, modifier la copie et retrouver celle-ci sans modifier l'original ni un snapshot de projet.

### Tests

- [ ] T022 [P] [US2] Écrire les tests échouants origine/version/duplication/éligibilité dans `packages/catalog/test/unit/equipment-ownership.unit.test.ts`
- [ ] T023 [P] [US2] Écrire les propriétés d'immutabilité KYA et stabilité des snapshots dans `packages/catalog/test/property/equipment-versioning.property.test.ts`
- [ ] T024 [P] [US2] Étendre les tests de filtres dépendants partagés dans `apps/desktop/test/unit/catalog-filters.unit.test.ts`
- [ ] T025 [P] [US2] Écrire le test d'intégration CRUD et conflit de version dans `apps/desktop/test/integration/user-catalog.integration.test.ts`

### Implementation

- [ ] T026 [US2] Étendre les schémas équipement avec origine, version, ascendance et éligibilité dans `packages/catalog/src/schemas.ts`
- [ ] T027 [US2] Implémenter les commandes pures créer/versionner/dupliquer/archiver dans `packages/catalog/src/user-equipment.ts`
- [ ] T028 [US2] Implémenter l'adaptateur persistant du catalogue utilisateur dans `apps/desktop/src/app/adapters/userCatalog.ts`
- [ ] T029 [US2] Généraliser les descripteurs de filtres par famille dans `apps/desktop/src/app/models/catalogFilters.ts`
- [ ] T030 [US2] Raccorder les filtres partagés et actions de propriété à `apps/desktop/src/routes/Catalog.tsx`
- [ ] T031 [US2] Raccorder les mêmes filtres et statuts d'éligibilité à `apps/desktop/src/routes/workshop/EquipmentPicker.tsx`
- [ ] T032 [US2] Ajouter le formulaire spécialisé module/batterie/onduleur dans `apps/desktop/src/routes/catalog/EquipmentEditor.tsx`
- [ ] T033 [US2] Ajouter le parcours KYA/duplication/version au test `apps/desktop/e2e/catalog.spec.ts`
- [ ] T034 [US2] Exécuter `pnpm verify:phase` et consigner US2 dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

---

## Phase 5: User Story 3 — Dimensionnement manuel (Priority: P1)

**Goal**: Dimensionner uniquement les références choisies et fournir résultats, estimation et diagnostics traçables.

**Independent Test**: Trois références compatibles donnent une configuration déterministe ; un changement rend toutes les sorties aval obsolètes.

### Tests

- [ ] T035 [P] [US3] Étendre les tests échouants de contraintes et configurations entières dans `packages/engine/test/unit/sizing.engine.unit.test.ts`
- [ ] T036 [P] [US3] Ajouter les invariants couverture minimale et déterminisme dans `packages/engine/test/property/sizing.property.test.ts`
- [ ] T037 [P] [US3] Ajouter les goldens manuels revus dans `packages/engine/test/golden/sizing.golden.test.ts`
- [ ] T038 [P] [US3] Écrire le test d'intégration sélection → résultat → obsolescence dans `apps/desktop/test/integration/manual-sizing.integration.test.ts`

### Implementation

- [ ] T039 [US3] Étendre les snapshots, sorties et preuves de dimensionnement dans `packages/engine/src/sizing/contracts.ts`
- [ ] T040 [US3] Implémenter le calcul manuel complet et les diagnostics dans `packages/engine/src/sizing/engine.ts`
- [ ] T041 [US3] Créer le service applicatif de dimensionnement et persistance dans `apps/desktop/src/app/services/manualSizing.ts`
- [ ] T042 [US3] Retirer l'orchestration de calcul React et raccorder le service dans `apps/desktop/src/routes/workshop/SectionMateriel.tsx`
- [ ] T043 [US3] Afficher valeurs requises/obtenues, contraintes et estimation indicative dans `apps/desktop/src/routes/workshop/SizingResult.tsx`
- [ ] T044 [US3] Ajouter le parcours manuel et les états invalides dans `apps/desktop/e2e/detailed-sizing.spec.ts`
- [ ] T045 [US3] Exécuter `pnpm verify:phase` et consigner US3 dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

---

## Phase 6: User Story 4 — Optimisation optionnelle (Priority: P2)

**Goal**: Générer et classer des solutions dans le champ configuré sans application silencieuse.

**Independent Test**: Module libre, deux batteries autorisées et onduleur imposé ne produisent aucune solution hors scope et exigent confirmation.

### Tests

- [ ] T046 [P] [US4] Écrire les tests échouants des scopes et trois classements dans `packages/engine/test/unit/sizing-optimization.unit.test.ts`
- [ ] T047 [P] [US4] Écrire les propriétés de déterminisme, validité et monotonie des limites dans `packages/engine/test/property/sizing-optimization.property.test.ts`
- [ ] T048 [P] [US4] Ajouter un golden de classement expliqué dans `packages/engine/test/golden/sizing-optimization.golden.test.ts`
- [ ] T049 [P] [US4] Écrire le test d'intégration proposition puis confirmation dans `apps/desktop/test/integration/sizing-optimization.integration.test.ts`

### Implementation

- [ ] T050 [US4] Ajouter requête, candidat, progression et justification dans `packages/engine/src/sizing/optimization-contracts.ts`
- [ ] T051 [US4] Implémenter génération, rejet, métriques et ordres lexicographiques dans `packages/engine/src/sizing/optimizer.ts`
- [ ] T052 [US4] Créer le service applicatif d'exécution et d'application confirmée dans `apps/desktop/src/app/services/sizingOptimization.ts`
- [ ] T053 [US4] Ajouter activation, scopes et objectifs dans `apps/desktop/src/routes/workshop/OptimizationSettings.tsx`
- [ ] T054 [US4] Ajouter comparaison et justification des candidats dans `apps/desktop/src/routes/workshop/OptimizationResults.tsx`
- [ ] T055 [US4] Ajouter le scénario scopes, classement et confirmation dans `apps/desktop/e2e/detailed-sizing.spec.ts`
- [ ] T056 [US4] Exécuter `pnpm verify:phase` et consigner US4 dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

---

## Phase 7: User Story 5 — Protections version 1 (Priority: P2)

**Goal**: Calculer les exigences, puis faire choisir explicitement type et calibre par tronçon.

**Independent Test**: Aucun calibre n'est confirmable avant le choix gPV/DC, gG/DC ou AC ; toutes les bornes de plage sont respectées.

### Tests

- [ ] T057 [P] [US5] Réécrire les tests échouants de plages par tronçon dans `packages/engine/test/unit/protection-cabling.engine.unit.test.ts`
- [ ] T058 [P] [US5] Ajouter les propriétés calibre dans plage et série normalisée dans `packages/engine/test/property/protection-sizing.property.test.ts`
- [ ] T059 [P] [US5] Ajouter les goldens approuvés `core` v1 corrigés dans `packages/engine/test/golden/protection-sizing.golden.test.ts`
- [ ] T060 [P] [US5] Écrire le test d'intégration type → calibre → invalidation dans `apps/desktop/test/integration/protection-choice.integration.test.ts`

### Implementation

- [ ] T061 [US5] Remplacer le contrat de type unique par exigence/types/choix dans `packages/engine/src/protection-cabling/contracts.ts`
- [ ] T062 [US5] Implémenter les exigences par tronçon et le filtrage complet des séries dans `packages/engine/src/protection-cabling/protection.ts`
- [ ] T063 [US5] Versionner les séries normalisées approuvées dans `packages/catalog/data/protection-ratings.json`
- [ ] T064 [US5] Ajouter la validation de données des séries dans `packages/catalog/test/data/protection-ratings.data.test.ts`
- [ ] T065 [US5] Créer le service applicatif de choix et revalidation dans `apps/desktop/src/app/services/protectionSelection.ts`
- [ ] T066 [US5] Refaire le tableau et le choix obligatoire du type puis calibre dans `apps/desktop/src/routes/workshop/SectionProtections.tsx`
- [ ] T067 [US5] Ajouter le scénario des trois tronçons dans `apps/desktop/e2e/protection-cabling.spec.ts`
- [ ] T068 [US5] Exécuter `pnpm verify:phase` et consigner US5 dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

---

## Phase 8: User Story 6 — Câbles à quatre entrées (Priority: P2)

**Goal**: Saisir uniquement longueur, matériau, pose et chute maximale, puis afficher toutes les valeurs dérivées en lecture seule.

**Independent Test**: Changer une des quatre entrées ou la protection recalcule section et chute sans exposer une sortie éditable.

### Tests

- [ ] T069 [P] [US6] Écrire les tests échouants thermique/chute/normalisation dans `packages/engine/test/unit/cable-sizing.unit.test.ts`
- [ ] T070 [P] [US6] Ajouter les propriétés section non décroissante et conformité dans `packages/engine/test/property/cable-sizing.property.test.ts`
- [ ] T071 [P] [US6] Ajouter les goldens câble approuvés dans `packages/engine/test/golden/cable-sizing.golden.test.ts`
- [ ] T072 [P] [US6] Écrire le test d'intégration protection → câble → obsolescence dans `apps/desktop/test/integration/cable-sizing.integration.test.ts`

### Implementation

- [ ] T073 [US6] Étendre les quatre entrées et sorties traçables dans `packages/engine/src/protection-cabling/contracts.ts`
- [ ] T074 [US6] Implémenter sections concurrentes, gouvernante et chute réelle dans `packages/engine/src/protection-cabling/cable.ts`
- [ ] T075 [US6] Créer le service applicatif câble et invalidation dans `apps/desktop/src/app/services/cableSizing.ts`
- [ ] T076 [US6] Limiter les champs éditables et présenter les sorties dans `apps/desktop/src/routes/workshop/SectionProtections.tsx`
- [ ] T077 [US6] Ajuster le tableau responsive et les états lecture seule dans `apps/desktop/src/styles/app.css`
- [ ] T078 [US6] Ajouter le scénario quatre entrées et recalcul dans `apps/desktop/e2e/protection-cabling.spec.ts`
- [ ] T079 [US6] Exécuter `pnpm verify:phase` et consigner US6 dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

---

## Phase 9: Polish et convergence

- [ ] T080 [P] Vérifier les traductions et unités avec les contrôles dans `tools/ui/check-i18n.mjs`
- [ ] T081 [P] Ajouter les assertions accessibilité et clavier dans `apps/desktop/e2e/accessibility.spec.ts`
- [ ] T082 [P] Ajouter les captures FR/EN 1024/1440 dans `apps/desktop/e2e/visual.spec.ts`
- [ ] T083 Exécuter tous les scénarios de `specs/009-detailed-sizing-safety/quickstart.md`
- [ ] T084 Fermer les preuves scientifiques et de migration dans `specs/009-detailed-sizing-safety/checklists/scientific-approval.md`
- [ ] T085 Exécuter `pnpm verify` et `git diff --check`, puis consigner le résultat dans `specs/009-detailed-sizing-safety/checklists/phase-gates.md`

## Dependencies & Execution Order

- Phase 1 précède Phase 2 ; Phase 2 bloque tous les parcours.
- US1 et US2 peuvent avancer en parallèle après les fondations.
- US3 dépend des contrats de US1 et du catalogue US2.
- US4 dépend du moteur manuel US3.
- US5 dépend d'une configuration détaillée valide US3 ; elle ne dépend pas de l'activation US4.
- US6 dépend de US5.
- La convergence dépend des six parcours désirés.

## Parallel Opportunities

- Les fixtures, goldens et validations de Phase 1 sont parallélisables après attribution de propriétaires de fichiers.
- Les tests US1/US2 peuvent avancer parallèlement.
- Pour chaque story, tests unitaires, propriétés, goldens et intégration sont séparables avant raccordement.
- Après US3, l'optimisation US4 et la préparation scientifique de US5 peuvent avancer en parallèle, mais US5 n'est raccordée qu'à un résultat manuel validé.

## Implementation Strategy

1. Livrer d'abord US1 + US2 + US3 : saisies fiables, catalogue maîtrisé et dimensionnement manuel complet.
2. Ajouter US4 comme aide optionnelle sans modifier le parcours manuel.
3. Ajouter US5 puis US6 dans l'ordre de dépendance électrique.
4. Arrêter à chaque checkpoint pour revue fonctionnelle et `verify:phase`.

## Format Validation

Les 85 tâches utilisent le format checkbox + identifiant séquentiel + marqueur parallèle optionnel + story requise + chemin explicite. Les tests sont inclus car la spec exige une assurance unitaire, de limites, d'invariants, golden, intégration et navigateur.
