# Tasks: Refonte UX (UX-001)

**Input**: `spec.md`, `plan.md`
**Gate**: `pnpm verify:phase` après chaque lot ; `pnpm verify` en fermeture

## Lot 1 — Navigation, appareils et horaires

- [x] T001 Libellé « Préparer les documents client → » (FR-001)
- [x] T002 Panneau de droite replié sans prédimensionnement, préférence mémorisée (FR-002)
- [x] T003 P-1 : retirer versions de méthode, compteurs internes, jargon des écrans de l'atelier (FR-003)
- [x] T004 Moteur + domaine : supprimer la simultanéité ; tests (FR-022, D3)
- [x] T005 Format : `inductive` facultatif, `simultaneityRatio` en lecture seule, avis de migration (D2, D3)
- [x] T006 Vue : `appliances[]` unique ; adaptateurs, rapports, Excel, tests (D2)
- [x] T007 Tableau unique, règles Coef. dém. / Inductif, pointe au démarrage (FR-019 → FR-021)
- [x] T008 `HoursStrip` au survol, `HoursPopover` au clic, modèles par plages (FR-023 → FR-025)
- [x] T009 `HoursPlanner` remplace `OperatingHoursDialog` (FR-026)
- [x] T010 Tests E2E appareils et horaires ; `pnpm verify:phase`

## Lot 2 — Sources de consommation

- [x] T011 Format + vue : source `annual`, `annualPoints`, migration des séries 8 760 (D1)
- [x] T012 `projectToAio` : source `annual` ; tests d'intégration (D1)
- [x] T013 Question « De quoi disposez-vous ? » et barre des cinq sources, données conservées (FR-012, FR-013)
- [x] T014 Passerelle appareils → année composée (FR-014)
- [x] T015 Journée type : histogramme, tableau Moyenne / Pointe, « = », collage (FR-015, D5)
- [x] T016 Année composée : résumé, aperçu calendrier, contrôle, « Depuis l'inventaire » (FR-016, D6)
- [x] T017 Année importée : carte de chaleur, chiffres clés, Remplacer / Retirer (FR-017)
- [x] T018 Profil annuel : vues chaleur / mois / journée, axe en mois (FR-018)
- [x] T019 Tests ; `pnpm verify:phase`

## Lot 3 — Optimisation

- [x] T020 Réglages : Mes références, plafonds, nombre de propositions (FR-027, FR-028)
- [x] T021 Catalogue : étoile et compteurs (FR-027)
- [x] T022 Fenêtre Optimiser : sources, combinaisons, objectifs, limites repliées (FR-029, FR-030)
- [x] T023 Simulation horaire des N meilleurs, progression, annulation, Retenir (FR-031)
- [x] T024 Sélecteurs manuels triés ; texte d'état à la place du faux bouton (FR-032, FR-033)
- [x] T025 Tests ; `pnpm verify:phase`

## Lot 4 — Accueil, cycle de vie, site

- [x] T026 Format : versions émises, verrou ; migration (D8)
- [x] T027 Émettre / lecture seule / Créer une révision / versions réimprimables (FR-008 → FR-011)
- [x] T028 Accueil premier lancement et tableau de bord, filtres d'état (FR-004 → FR-006)
- [x] T029 Projet exemple embarqué (FR-007)
- [x] T030 Site : météo d'abord, mois critique expliqué (FR-034, FR-035)
- [x] T031 Tests ; `pnpm verify:phase`

## Lot 5 — Fermeture

- [x] T032 Traductions complètes, contrôle étendu (FR-036)
- [x] T033 Nettoyage des feuilles de style sans régression (FR-037)
- [x] T034 Captures de référence, CHANGELOG, README, ROADMAP `UX-001`, version 1.1.0 (FR-038)
- [x] T035 `pnpm verify` ; installateur
