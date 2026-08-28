# Tasks — PAGE1-002

> Découpage révisé pour validation. Les tâches UI de la précédente tentative ne
> valent pas acceptation : le dialogue composé et la visualisation multi-fréquence
> doivent être validés avant réimplémentation.

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

## Phase 4 — Autorité simple/composée

- [ ] T021 Ajouter `LoadDefinitionV2` avec branches simple et composée.
- [ ] T022 Migrer V1 vers `activeMode = simple` sans perte d’équipement,
  profil horaire ou facture.
- [ ] T023 Ajouter l’organisation `periods` et ses invariants `all-days`.
- [ ] T024 Interdire structurellement équipement/facture dans les profils composés.
- [ ] T025 Tester bascule simple ↔ composé, conservation et autorité unique.
- [ ] T026 Passer `pnpm verify:phase`.

## Phase 5 — Dialogue de composition

- [ ] T027 Retirer l’éditeur composé intégré à la page principale.
- [ ] T028 Implémenter le dialogue unique et son brouillon isolé.
- [ ] T029 Implémenter organisation, jours, périodes et couverture visible.
- [ ] T030 Implémenter la liste/matrice des combinaisons et leur navigation.
- [ ] T031 Implémenter l’éditeur 0 h–23 h moyenne/pointe facultative.
- [ ] T032 Raccorder import/export à la combinaison sélectionnée.
- [ ] T033 Implémenter copier, réutiliser, profils partagés et orphelins.
- [ ] T034 Implémenter résumé d’erreurs, vérification et aperçu de migration.
- [ ] T035 Implémenter annulation sans mutation et commit atomique avec conflit.
- [ ] T036 Remplacer les formulaires simples par une synthèse en mode composé.
- [ ] T037 Tester FR/EN, clavier, Escape, focus, 1024×700 et 760 px.
- [ ] T038 Passer `pnpm verify:phase`.

## Phase 6 — Série et visualisation multi-fréquence

- [ ] T039 Conserver la série annuelle horaire comme autorité immuable.
- [ ] T040 Implémenter `AnnualChartQueryV1` hors React.
- [ ] T041 Implémenter plages année/période/mois/semaine/jour/personnalisée.
- [ ] T042 Implémenter fréquences auto/horaire/jour/semaine/mois.
- [ ] T043 Implémenter agrégations somme/moyenne pondérée/maximum et tests propriétés.
- [ ] T044 Implémenter courbe annuelle, sélecteurs, zoom et période visible.
- [ ] T045 Implémenter réduction de rendu préservant les extrema.
- [ ] T046 Implémenter vue jour 24 heures et infobulles contextualisées.
- [ ] T047 Implémenter export fidèle à la plage/fréquence sélectionnée.
- [ ] T048 Tester invariance du hash/YEn, conservation d’énergie et performance.
- [ ] T049 Passer scénarios visuels FR/EN et `pnpm verify:phase`.

## Phase 7 — Nettoyage de Page 1

- [ ] T050 Retirer photo et encadré facture avec migration associée.
- [ ] T051 Retirer les filets gauches des alertes et vérifier les états accessibles.
- [ ] T052 Passer `pnpm verify:phase`.

## Phase 8 — Réseau et données durables

- [ ] T053 Ajouter le snapshot ISO bilingue actuel et son contrôle de données.
- [ ] T054 Étendre les localités aux noms original/fr/en et migrer les données.
- [ ] T055 Injecter la configuration réseau au bootstrap.
- [ ] T056 Implémenter adaptateurs Vite dev et passerelle web production.
- [ ] T057 Implémenter la chaîne local/principal/secours/coordonnées.
- [ ] T058 Supprimer l’écriture météo lors de la prévisualisation.
- [ ] T059 Implémenter la commande atomique de confirmation météo.
- [ ] T060 Ajouter l’adaptateur SQLite/Tauri dans la tranche desktop approuvée.
- [ ] T061 Tester redémarrage, déduplication, conflits et pannes partielles.
- [ ] T062 Passer `pnpm verify:phase`.

## Phase 9 — Fermeture

- [ ] T063 Exécuter tous les scénarios du quickstart.
- [ ] T064 Fermer les checklists exigences et visuelles.
- [ ] T065 Produire preuves golden, migrations et matrice dev/web/Tauri.
- [ ] T066 Exécuter `pnpm verify` et `git diff --check`.
