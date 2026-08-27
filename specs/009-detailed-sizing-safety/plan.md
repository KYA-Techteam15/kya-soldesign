# Implementation Plan: Dimensionnement détaillé et sécurité électrique

**Branch**: `009-detailed-sizing-safety` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

## Summary

Faire évoluer le parcours existant en six incréments : structurer les hypothèses économiques, versionner un catalogue KYA/utilisateur, consolider le dimensionnement manuel, ajouter une optimisation explicitement activée et configurable, porter les règles de protection de `core` version 1 avec choix utilisateur du type et du calibre, puis réduire le formulaire câble à quatre entrées. Tous les calculs et classements restent dans le moteur pur ; l'interface ne fait que saisir, commander et présenter des enveloppes traçables.

## Technical Context

**Language/Version**: TypeScript 7, React 19, Node.js >= 22.14  
**Primary Dependencies**: Zod, React Router, packages internes `@ksd/domain`, `@ksd/catalog`, `@ksd/engine`, `@ksd/project-format`  
**Storage**: format projet JSON versionné derrière les ports existants ; catalogue KYA embarqué et catalogue utilisateur persistant derrière un port, compatible avec la future cible SQLite/Tauri  
**Testing**: Vitest, fast-check, golden datasets revus, Playwright, contrôles de données catalogue  
**Target Platform**: application web hors ligne après chargement, future application desktop Tauri  
**Project Type**: monorepo application + packages de domaine et calcul  
**Performance Goals**: dimensionnement manuel perçu en moins de 1 s ; progression visible pour une optimisation plus longue ; filtres perçus instantanément sur le catalogue embarqué  
**Constraints**: aucune formule React, aucune dépendance runtime vers le code Python, aucune modification des références KYA, aucune application automatique d'une solution optimisée ou d'un type de protection  
**Scale/Scope**: modules, batteries, onduleurs AIO, trois tronçons électriques, séries normalisées de protections, six parcours utilisateur

## Constitution Check

| Principe | État avant conception | Contrainte de mise en œuvre |
|---|---|---|
| Calculs véridiques | PASS conditionnel | aucune valeur de démonstration ; indisponibilité motivée |
| Moteur TypeScript pur | PASS | conversions, dimensionnement, optimisation, protection et câble dans `packages/engine` |
| Unités, provenance, traçabilité | PASS | unités dans les noms, snapshots, versions, hash, traces et diagnostics |
| Assurance scientifique | PASS conditionnel | goldens humains requis pour formules de protection et câble |
| Gates autonomes | PASS | `pnpm verify:phase` à chaque incrément et `pnpm verify` en fermeture |
| Migration sûre | PASS conditionnel | format projet V2 et migration explicite soumis à approbation humaine |
| Discipline de périmètre | PASS | pas de finance complète ni catalogue commercial de protections |

## Project Structure

### Documentation

```text
specs/009-detailed-sizing-safety/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
├── contracts/
│   ├── economic-assumptions.md
│   ├── equipment-catalog.md
│   ├── sizing-optimization.md
│   └── protection-cabling.md
└── tasks.md
```

### Source Code

```text
packages/catalog/
├── src/
└── test/

packages/engine/
├── src/sizing/
├── src/protection-cabling/
└── test/{unit,property,golden}/

packages/project-format/
├── src/
└── test/

apps/desktop/src/
├── app/models/
├── app/services/
├── routes/workshop/
└── styles/

apps/desktop/test/{unit,integration}/
apps/desktop/e2e/
tools/calculation-register/
```

**Structure Decision**: étendre les packages existants. Les modèles de formulaire et ports applicatifs orchestrent les opérations ; les catalogues valident les données ; le moteur produit toutes les valeurs dérivées ; le format projet versionne les choix et snapshots.

## Architecture cible

```text
UI de l'atelier
  ↓ commandes et modèles de formulaire
Services applicatifs ─── Catalogue KYA/utilisateur persistant
  ↓ contrats sérialisables
Moteur pur
  ├── dimensionnement manuel
  ├── optimisation optionnelle
  └── protections puis câbles
  ↓ enveloppes versionnées
Projet persistant + présentation traçable
```

## Phases d'implémentation

### Phase 1 — Contrats, sources et migration

1. Approuver les formules et séries héritées du principe `core` v1.
2. Définir les contrats économiques, catalogue, optimisation, protection et câble.
3. Définir la migration du format projet et les invalidations en cascade.
4. Ajouter les jeux de référence et les tests échouant avant implémentation.
5. Exécuter `pnpm verify:phase`.

### Phase 2 — Hypothèses et catalogue

1. Implémenter la conversion économique et la provenance.
2. Ajouter propriété, version et ascendance au catalogue.
3. Implémenter CRUD utilisateur et duplication sans mutation KYA.
4. Unifier les filtres du catalogue et des sélecteurs.
5. Exécuter `pnpm verify:phase`.

### Phase 3 — Dimensionnement manuel

1. Renforcer le contrat des instantanés et l'éligibilité calculatoire.
2. Déplacer toute orchestration de calcul hors React.
3. Produire résultats, diagnostics, estimation principale et invalidation.
4. Raccorder la page Matériel et ses états.
5. Exécuter `pnpm verify:phase`.

### Phase 4 — Optimisation optionnelle

1. Implémenter les trois champs de recherche par famille.
2. Générer et rejeter les combinaisons avec raisons.
3. Calculer métriques et classements lexicographiques déterministes.
4. Présenter plusieurs solutions et exiger une confirmation avant application.
5. Exécuter `pnpm verify:phase`.

### Phase 5 — Protections version 1

1. Enregistrer les formules, séries et goldens approuvés.
2. Calculer exigences et types admissibles par tronçon.
3. Exiger le choix explicite du type puis du calibre.
4. Présenter le tableau des exigences et calibres compatibles.
5. Exécuter `pnpm verify:phase`.

### Phase 6 — Câbles et convergence

1. Versionner les quatre entrées câble par tronçon.
2. Calculer sections, contrainte déterminante, chute réelle et conformité.
3. Raccorder l'invalidation protection → câble.
4. Vérifier FR/EN, clavier, rechargement et visualisation.
5. Exécuter le quickstart, `pnpm verify` et `git diff --check`.

## Re-check de constitution après conception

La conception ne requiert aucune dérogation. Les seules portes humaines restent l'approbation des règles électriques, des goldens, de l'arrondi monétaire et de la migration du format projet. Aucun calcul ne demeure dans l'interface et aucun comportement Python n'est appelé en production.

## Complexity Tracking

Aucune violation constitutionnelle à justifier.
