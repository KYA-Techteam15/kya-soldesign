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
