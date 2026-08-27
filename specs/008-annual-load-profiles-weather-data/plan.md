# Implementation Plan: Profils annuels, échanges de charges et données météo durables

**Branch**: `008-annual-load-profiles-weather-data`  
**Date**: 2026-08-27  
**Spec**: [spec.md](./spec.md)

## Summary

Introduire un modèle temporel V2 séparant profils, calendrier et affectations ;
ajouter des frontières Excel strictes ; calculer le YEn annuel dans le moteur pur ;
puis remplacer les URLs réseau relatives au serveur Vite par des adaptateurs de
plateforme configurables. La persistance reste derrière des ports et converge
vers SQLite sous Tauri tout en conservant un JSON projet portable.

## Technical Context

**Language/Version**: TypeScript 7, React 19, Node.js >= 22.14  
**Dependencies**: Zod, Vite, React Router, packages KSD ; bibliothèque `.xlsx` à
sélectionner selon taille, maintenance et fonctionnement hors ligne  
**Calculation**: fonctions pures dans `packages/engine`  
**Storage**: adaptateurs navigateur actuels ; cible SQLite Tauri + JSON canonique  
**Network**: passerelle web same-origin configurée ; adaptateur HTTP Tauri futur  
**Testing**: Vitest, fast-check, golden tests, Playwright  
**Constraints**: hors ligne sauf acquisition météo/géocodage associé ; aucune
formule React ; aucun runtime vers `ksd_app` ; import sans mutation partielle.

## Constitution Check

| Principe | État | Preuve ou contrainte |
|---|---|---|
| Calculs véridiques | PASS conditionnel | équation annuelle contractuelle et indisponibilité explicite |
| Moteur TypeScript pur | PASS | calendrier, série et agrégation dans `packages/engine` |
| Unités/provenance | PASS | Wh, W, kW et traces explicités aux frontières |
| Assurance scientifique | PASS conditionnel | golden datasets à approuver avant fermeture |
| Gates autonomes | PASS | `verify:phase` par phase, `verify` en fermeture |
| Migration sûre | PASS conditionnel | `ProjectInputsV2` exige approbation humaine |
| Discipline de périmètre | PASS | trois organisations seulement, pas de SOC annuel |

## Architecture cible

```text
React — formulaires, aperçu, graphes
  ↓ view/form models
Application services — import, calendrier, météo, transactions
  ↓ ports
Project format | Engine | Catalog | Platform adapters
                   ↓
       Browser gateway / Tauri HTTP
       IndexedDB transition / Tauri SQLite
```

## Phase 1 — Contrats et migration

1. Ajouter les contrats temporels et d’import sans les brancher à React.
2. Définir `ProjectInputsV2`, la lecture V1 et la suppression migrée de
   `projectImageRef` et de `simultaneityRatio` pour ce flux.
3. Figer le registre `CALC-P1-012/013` et les golden datasets du YEn annuel.
4. Ajouter les ports localisation, météo, bibliothèque et transaction projet.
5. Exécuter `pnpm verify:phase`.

## Phase 2 — Import/export des charges

1. Implémenter les parseurs et sérialiseurs Excel hors React.
2. Implémenter la validation exhaustive, les alias FR/EN et l’aperçu atomique.
3. Raccorder l’inventaire puis le profil horaire actif.
4. Tester plages, décimales, heures par défaut et round-trip.
5. Exécuter `pnpm verify:phase`.

## Phase 3 — Calendrier et YEn annuel

1. Implémenter partitions de jours, périodes, croisements et résolveur de date.
2. Développer les profils en série alignée sur les horodatages météo.
3. Implémenter facteurs locaux, poids énergétiques et agrégation annuelle.
4. Ajouter tests unitaires, propriétés, bornes et goldens.
5. Exécuter `pnpm verify:phase`.

## Phase 4 — Parcours et visualisations

1. Remplacer le dialogue de granularité par le parcours à trois organisations.
2. Ajouter affectation, copie, saisie/import et contrôles de couverture.
3. Ajouter vues annuelle agrégée et journalière sans calcul React.
4. Retirer photo, encadré facture et filets gauches d’alerte.
5. Vérifier français, anglais, clavier et fenêtres contraintes.
6. Exécuter `pnpm verify:phase`.

## Phase 5 — Localisation, météo et persistance

1. Remplacer les chemins `/external/*` des clients par une configuration injectée.
2. Conserver le proxy Vite comme adaptateur de développement uniquement.
3. Ajouter l’adaptateur de passerelle web de production et ses diagnostics.
4. Ajouter cache local, référentiel pays et noms de localité localisés.
5. Unifier « confirmer la météo » en une transaction applicative unique.
6. Préparer et tester l’adaptateur SQLite/Tauri sans faire dépendre le domaine de Tauri.
7. Exécuter `pnpm verify:phase`.

## Phase 6 — Convergence

1. Exécuter les scénarios de [quickstart.md](./quickstart.md).
2. Valider les checklists exigences et visuelles.
3. Exécuter `pnpm verify` et `git diff --check`.
4. Produire la table de migration, les preuves golden et le rapport de
   fonctionnement dev/web/Tauri.

## Risques à contrôler

- confusion entre moyenne de facteurs et facteur d’une série moyenne ;
- décalage UTC/local et années de 8 784 heures ;
- perte de profils lors d’un changement d’organisation ;
- import Excel partiellement appliqué ;
- passerelle disponible en dev mais absente après déploiement du `dist` ;
- double sauvegarde météo dans bibliothèque et projet ;
- référentiel pays obsolète copié depuis l’ancien logiciel.

