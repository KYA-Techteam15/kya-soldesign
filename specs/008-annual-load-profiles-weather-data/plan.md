# Implementation Plan: Profils annuels, échanges de charges et données météo durables

**Branch**: `008-annual-load-profiles-weather-data`  
**Date**: 2026-08-28
**Spec**: [spec.md](./spec.md)

## Summary

Introduire un modèle V2 séparant le besoin simple du besoin composé, puis séparer
profils, calendrier et affectations dans la branche composée. Toute composition
est éditée dans un dialogue transactionnel exclusivement horaire. Ajouter des
frontières Excel strictes, calculer le YEn annuel dans le moteur pur et dériver
des séries de présentation à plage/fréquence variables sans altérer les 8 760
points horaires. Remplacer enfin les URLs relatives au serveur Vite par des
adaptateurs de plateforme configurables. La persistance reste derrière des ports
et converge vers SQLite sous Tauri tout en conservant un JSON projet portable.

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
| Discipline de périmètre | PASS | trois organisations composées, pas de SOC annuel |
| Autorité des entrées | PASS conditionnel | branche simple ou composée active, jamais les deux |
| Transaction UI | PASS conditionnel | brouillon isolé, validation puis commit unique |

## Architecture cible

```text
React — besoin simple | dialogue composé | graphes de résultats
  ↓ view/form/query models
Application services — brouillons, import, calendrier, agrégation visuelle, transactions
  ↓ ports
Project format | Engine | Catalog | Platform adapters
                   ↓
       Browser gateway / Tauri HTTP
       IndexedDB transition / Tauri SQLite
```

## Contrats de référence

- [Dialogue de profils composés](./contracts/annual-profile-composer.md)
- [Visualisation annuelle multi-fréquence](./contracts/annual-chart.md)
- [Classeurs de charges](./contracts/load-workbooks.md)
- [Facteur YEn annuel](./contracts/annual-yen.md)
- [Localisation et météo](./contracts/location-weather.md)
- [Persistance](./contracts/persistence.md)

## Phase 1 — Contrats et migration

1. Ajouter les contrats temporels et d’import sans les brancher à React.
2. Définir `LoadDefinitionV2` avec branches simple/composée, `ProjectInputsV2`,
   la lecture V1 et la suppression migrée de
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

1. Implémenter les organisations ouvrés/week-end, périodes seules et
   périodes × types de jour, leurs partitions et le résolveur de date.
2. Développer les profils en série alignée sur les horodatages météo.
3. Implémenter facteurs locaux, poids énergétiques et agrégation annuelle.
4. Ajouter tests unitaires, propriétés, bornes et goldens.
5. Exécuter `pnpm verify:phase`.

## Phase 4 — Parcours et visualisations

1. Remplacer l’éditeur intégré à la page par un dialogue unique de composition.
2. Implémenter un brouillon isolé, annulation sans mutation, migration explicite
   et commit atomique après vérification globale.
3. Ajouter organisation, jours, périodes, matrice, navigation par combinaison,
   saisie 0 h–23 h, import/export, copie et réutilisation dans ce dialogue.
4. Masquer équipements et facture en mode composé et afficher une synthèse
   compacte ; conserver la branche simple inactive sans perte.
5. Construire la série horaire annuelle puis un service pur de requête graphique
   pour plage et fréquence, avec agrégations énergie/moyenne/pointe explicites.
6. Ajouter vue année/période/mois/semaine/jour/plage libre, fréquence auto/horaire/
   journalière/hebdomadaire/mensuelle, zoom et détail journalier.
7. Retirer photo, encadré facture et filets gauches d’alerte.
8. Vérifier français, anglais, clavier et fenêtres contraintes.
9. Exécuter `pnpm verify:phase`.

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
- mutation du projet avant confirmation du dialogue ;
- confusion entre besoin simple conservé et branche composée active ;
- exposition accidentelle d’équipements ou facture dans une combinaison ;
- confusion entre fréquence d’affichage et fréquence du calcul scientifique ;
- agrégation incorrecte entre énergie, puissance moyenne et pointe ;
- réduction graphique qui efface une pointe rare sur 8 760 heures ;
- import Excel partiellement appliqué ;
- passerelle disponible en dev mais absente après déploiement du `dist` ;
- double sauvegarde météo dans bibliothèque et projet ;
- référentiel pays obsolète copié depuis l’ancien logiciel.
