# Tâches — UI-AIO-001A Page 1

## Phase 1 — Contrat

- [x] T001 Écrire le goal Sol, la spec, le registre des formules et la carte des fichiers.
- [x] T002 Faire converger les décisions de modèle, notamment puissance/rendement, fuseau et ressource météo.
- [x] T003 Mettre AIO à `done` et UI-AIO à `in-progress` dans la roadmap.

## Phase 2 — Modèle et moteur de normalisation

- [x] T004 Écrire les tests du modèle Site/Météo, horaires et facture.
- [x] T005 Étendre `ProjectInputsV1` et la création vide sans fallback calculatoire.
- [x] T006 Écrire les tests equipment/direct/meter et propriétés.
- [x] T007 Implémenter la façade pure de normalisation et les événements de démarrage circulaires.
- [x] T008 Exécuter `pnpm verify:phase` et fermer les défauts de phase.

## Phase 3 — Adaptation AIO

- [x] T009 Écrire les tests projet → AIO et états de capacité.
- [x] T010 Implémenter `projectToAio` et le port AIO réel.
- [x] T011 Tester stale, réponse obsolète, provenance et résultats partiels.
- [x] T012 Exécuter `pnpm verify:phase`.

## Phase 4 — Interface validée

- [x] T013 Restaurer Site/Météo avec modèle canonique et états truthful.
- [x] T014 Restaurer Besoins et ses trois modes depuis le design validé.
- [x] T015 Implémenter le dialogue accessible des temps de fonctionnement.
- [x] T016 Brancher le bilan Page 1 à l'enveloppe AIO et compléter FR/EN.
- [x] T017 Exécuter le détecteur UI une fois puis `pnpm verify:phase`.

## Phase 5 — Acceptation

- [x] T018 Ajouter l'intégration projet → moteur et l'e2e Page 1.
- [x] T019 Valider desktop + fenêtre contrainte dans le navigateur intégré, corriger une passe, confirmer.
- [x] T020 Exécuter `pnpm verify`, documenter `convergence.md`, commit et push.

## Dépendances

`T001-T003 → T004-T008 → T009-T012 → T013-T017 → T018-T020`.

## Phase 6 — Météo réelle et qualité des données

- [x] T021 Enregistrer le goal A2, étendre spec/recherche/modèle/plan et auditer la nouvelle portée.
- [x] T022 Ajouter le JSON PVGIS 5.3 Bombouaka, son manifeste/hash et les tests de structure 8 760 pas.
- [x] T023 Supprimer du catalogue accepté toute source météo sans fichier et mettre à jour les rapports déterministes.
- [x] T024 Exécuter `pnpm test:data` puis `pnpm verify:phase`.

## Phase 7 — Moteur météo et γ

- [x] T025 Écrire les tests unitaires/propriétés du parseur, de la position solaire, de la POA et des agrégations.
- [x] T026 Écrire une comparaison pvlib documentée sur la fixture Bombouaka sans promouvoir le legacy en golden.
- [x] T027 Implémenter les contrats et calculs purs `DATA-P1-001`, `CALC-P1-008..011`.
- [x] T028 Étendre projet → AIO/Page 1 avec météo horaire, `γ`, traces, indisponibilité et stale.
- [x] T029 Exécuter les tests unitaires/propriétés/golden puis `pnpm verify:phase`.

## Phase 8 — Interface Site et Besoins finie

- [x] T030 Implémenter le port PVGIS 5.3 et l'import JSON avec timeout, annulation, erreurs et prévisualisation.
- [x] T031 Restaurer fidèlement le dialogue et les graphes Site/Météo de `design-proposition` avec données réelles.
- [x] T032 Finaliser les trois modes Besoins, horaires, graphes moyen/pointe/POA et états d'erreur/vides.
- [x] T033 Compléter FR/EN, clavier, focus, texte 200 %, responsive et provenance visible.
- [x] T034 Exécuter le détecteur UI une fois puis `pnpm verify:phase`.

## Phase 9 — Simulation et acceptation

- [x] T035 Ajouter intégration et E2E pour import/téléchargement, orientation, trois modes, graphes et `γ`.
- [x] T036 Simuler Bombouaka de bout en bout dans le navigateur intégré en desktop et fenêtre contrainte; corriger une passe.
- [x] T037 Exécuter `pnpm verify`, converger la spec, fermer les tâches ajoutées, commit et push.

## Dépendances A2

`T021-T024 → T025-T029 → T030-T034 → T035-T037`.
