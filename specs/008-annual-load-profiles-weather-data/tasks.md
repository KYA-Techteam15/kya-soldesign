# Tasks — PAGE1-002

> Brouillon de découpage pour validation. Aucune tâche ne doit démarrer avant
> approbation de la spec, de la formule et de la migration du format projet.

## Phase 1 — Contrats et preuves

- [ ] T001 Ajouter les schémas temporels V2 et leurs invariants.
- [ ] T002 Écrire les tests de partition des jours et couverture des périodes.
- [ ] T003 Définir `ProjectInputsV2` et la migration V1 sans implémenter l’UI.
- [ ] T004 Enregistrer les formules/sources du YEn annuel.
- [ ] T005 Créer les jeux golden approuvés et leurs attentes manuelles.
- [ ] T006 Définir les ports réseau, météo et transaction de persistance.
- [ ] T007 Passer `pnpm verify:phase`.

## Phase 2 — Frontières Excel

- [ ] T008 Sélectionner et documenter la bibliothèque `.xlsx` hors ligne.
- [ ] T009 Implémenter inspection/export des équipements.
- [ ] T010 Implémenter défaut horaire et rapport exhaustif des cellules.
- [ ] T011 Implémenter inspection/export du profil à trois colonnes.
- [ ] T012 Ajouter tests unitaires, propriétés et round-trip FR/EN.
- [ ] T013 Raccorder l’aperçu et le commit atomique aux écrans existants.
- [ ] T014 Passer `pnpm verify:phase`.

## Phase 3 — Moteur annuel

- [ ] T015 Implémenter le résolveur date locale → combinaison.
- [ ] T016 Construire la série annuelle alignée sur la météo.
- [ ] T017 Implémenter facteurs locaux, poids et agrégation annuelle.
- [ ] T018 Couvrir années, fuseaux, zéros, invariants et goldens.
- [ ] T019 Exposer enveloppe, hash, issues et trace.
- [ ] T020 Passer `pnpm verify:phase`.

## Phase 4 — Parcours utilisateur et graphes

- [ ] T021 Remplacer le dialogue de granularité par les trois organisations.
- [ ] T022 Implémenter jours, périodes, couverture et affectations.
- [ ] T023 Implémenter saisie/import/copie des profils combinés.
- [ ] T024 Implémenter vue annuelle et détail par date depuis les sorties moteur.
- [ ] T025 Retirer photo et encadré facture avec migration associée.
- [ ] T026 Retirer les filets gauches des alertes et vérifier les états accessibles.
- [ ] T027 Passer scénarios visuels FR/EN et `pnpm verify:phase`.

## Phase 5 — Réseau et données durables

- [ ] T028 Ajouter le snapshot ISO bilingue actuel et son contrôle de données.
- [ ] T029 Étendre les localités aux noms original/fr/en et migrer les données.
- [ ] T030 Injecter la configuration réseau au bootstrap.
- [ ] T031 Implémenter adaptateurs Vite dev et passerelle web production.
- [ ] T032 Implémenter la chaîne local/principal/secours/coordonnées.
- [ ] T033 Supprimer l’écriture météo lors de la prévisualisation.
- [ ] T034 Implémenter la commande atomique de confirmation météo.
- [ ] T035 Ajouter l’adaptateur SQLite/Tauri dans la tranche desktop approuvée.
- [ ] T036 Tester redémarrage, déduplication, conflits et pannes partielles.
- [ ] T037 Passer `pnpm verify:phase`.

## Phase 6 — Fermeture

- [ ] T038 Exécuter tous les scénarios du quickstart.
- [ ] T039 Fermer les checklists exigences et visuelles.
- [ ] T040 Produire preuves golden, migrations et matrice dev/web/Tauri.
- [ ] T041 Exécuter `pnpm verify` et `git diff --check`.

