# Implementation Plan: Finalisation de l’expérience applicative

**Branch**: `007-application-experience-completion` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-application-experience-completion/spec.md`

## Summary

Finaliser les surfaces transversales de KYA-SolDesign Next sans modifier les
calculs. La mise en œuvre introduit un contrat de réglages V2 validé et migré,
des ports de transfert et d’assets, un service unique de création de projet,
une page d’accueil réorganisée, des finitions catalogue et un contrôle
documentaire avant impression. Les capacités réseau de change et de licence
restent derrière des ports à état explicite jusqu’à approbation de leurs autorités.

## Technical Context

**Language/Version**: TypeScript 7, React 19, Node.js >= 22.14  
**Primary Dependencies**: React Router, Zustand, Zod, Vite, packages KSD internes  
**Storage**: localStorage versionné pour préférences et réglages ; adaptateur de projets existant ; IndexedDB pour assets documentaires ; ports de plateforme pour fichiers  
**Testing**: Vitest, fast-check, Playwright, contrôles UI du dépôt  
**Target Platform**: application React/Vite hors ligne, future enveloppe desktop Tauri  
**Project Type**: monorepo TypeScript, application desktop/web locale  
**Performance Goals**: accueil interactif sans calcul lourd ; filtre catalogue perceptible en moins de 100 ms sur le catalogue canonique ; aucune image de rapport chargée dans le bundle au-delà des assets validés  
**Constraints**: fonctionnement hors ligne, aucun mock de disponibilité, aucune formule dans React, format projet public inchangé sans gate, aucune dépendance au dépôt parent en production  
**Scale/Scope**: 5 routes actives, 4 documents A4, plusieurs centaines d’équipements et jusqu’à 12 projets récents affichés

## Constitution Check

### Avant Phase 0

| Principe | État | Preuve ou contrainte |
|---|---|---|
| Calculs véridiques | PASS | Aucun calcul scientifique ajouté ; les compteurs viennent des providers réels. |
| Moteur TypeScript pur | PASS | `packages/engine` n’est pas modifié par cette tranche. |
| Unités et traçabilité | PASS conditionnel | Unités centralisées dans les schémas ; taux avec paire ISO, source et date. |
| Assurance test-first | PASS | Tests de migration, contrats, propriétés et E2E prévus avant implémentation. |
| Gates autonomes | PASS | `verify:phase` par phase et `verify` en fermeture. |
| Migration sûre | PASS | Réglages V2 versionnés ; imports validés ; inconnues conservées comme inconnues. |
| Discipline de périmètre | PASS | Pas de nouvelle architecture système ni de backend spéculatif. |

### Gate après Phase 1

La conception doit être réévaluée si elle exige :

- une modification de `ProjectFileV1` ;
- un stockage de logo en base64 dans localStorage ;
- une valeur de licence active par défaut ;
- un taux distant sans source approuvée ;
- une deuxième autorité d’autosauvegarde ;
- un calcul financier en flottants binaires accumulés.

## Project Structure

### Documentation

```text
specs/007-application-experience-completion/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── contracts/
│   ├── application-settings-v2.md
│   ├── catalog-status.md
│   ├── platform-services.md
│   └── project-transfer.md
└── checklists/
    ├── requirements.md
    └── visual-acceptance.md
```

### Source Code

```text
apps/desktop/src/
├── app/
│   ├── contracts.ts
│   ├── CatalogProvider.tsx
│   ├── ProjectSessionProvider.tsx
│   ├── adapters/
│   │   ├── browserFileTransfer.ts
│   │   ├── browserProjects.ts
│   │   ├── reportAssetRepository.ts
│   │   └── unavailableLicense.ts
│   ├── models/
│   │   ├── applicationSettings.ts
│   │   ├── catalogFilters.ts
│   │   ├── documentReadiness.ts
│   │   ├── projectDefaults.ts
│   │   └── projectTransfer.ts
│   └── services/
│       ├── createProject.ts
│       ├── exchangeRates.ts
│       └── projectTransfer.ts
├── i18n/index.ts
├── routes/
│   ├── Home.tsx
│   ├── Projects.tsx
│   ├── Catalog.tsx
│   ├── Settings.tsx
│   └── dossier/
│       ├── DossierDocuments.tsx
│       └── ReportA4.tsx
├── shell/TopBar.tsx
├── store/
│   ├── settings.ts
│   └── ui.ts
└── styles/
    ├── app.css
    └── print.css

apps/desktop/test/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: conserver la pile active `routes/*` et l’architecture
ports/adaptateurs existante. Les schémas et transformations vont dans `app/models`,
les orchestrations dans `app/services`, les accès plateforme dans `app/adapters`,
et les composants restent des consommateurs sans logique de persistance ou de
conversion dupliquée.

## Architecture Decisions

### AD-001 — Réglages V2 composés, pas un store monolithique UI

`UiPreferencesV1` reste propriétaire de thème, intensité et langue.
`ApplicationSettingsV2` possède identité, défauts, projets, rapports et change.
La route Réglages compose les deux sources, sans dupliquer leur persistance.

### AD-002 — Brouillons de formulaires séparés des valeurs validées

Les inputs numériques conservent leur chaîne locale. La conversion et la
validation ont lieu à la validation du champ ou du formulaire. Une chaîne vide
ne devient jamais `0` via `Number('')`.

### AD-003 — Service de création comme seule application des défauts

Le provider de session délègue à `createProjectWithDefaults`. Le service reçoit
un projet canonique vide et un snapshot validé de défauts, puis retourne le
projet final à persister. Les routes ne recopient pas les affectations.

### AD-004 — Assets documentaires hors localStorage

Le JSON de réglages conserve uniquement `reportLogoAssetId` et les métadonnées
utiles. Le binaire est validé puis stocké dans IndexedDB derrière un repository.
Un fallback vers le logo applicatif reste disponible si aucun asset n’est défini.

### AD-005 — Transfert de fichiers par capacité de plateforme

Le navigateur utilise input fichier et téléchargement. Un futur hôte desktop
peut fournir sélecteur de dossier et écriture contrôlée sans modifier les routes.
Une préférence de dossier n’est affichée que si la capacité existe.

### AD-006 — Argent et change exacts aux frontières

Les taux sont des chaînes décimales validées et les montants transférés utilisent
les unités mineures. Cette tranche ne réécrit pas les calculs financiers existants
sans décision séparée ; elle évite d’introduire de nouveaux calculs flottants.

### AD-007 — Licence et réseau toujours véridiques

Les ports retournent des états discriminés. L’adaptateur par défaut retourne
`unconfigured` ou `unavailable`, jamais un succès de démonstration.

## Implementation Phases

### Phase 0 — Recherche et décisions

1. Confirmer les champs V1, les bornes métier et la matrice de migration.
2. Inventorier les chaînes codées directement et les comportements de plateforme.
3. Vérifier les métadonnées réellement disponibles pour catalogue et version.
4. Soumettre séparément les décisions fournisseur de taux et autorité de licence.

**Gate**: aucune inconnue ne doit recevoir une valeur par défaut inventée.

### Phase 1 — Contrats et fondations

1. Ajouter schémas V2, migrations et tests de propriétés.
2. Ajouter ports de transfert, assets, change, licence et release info.
3. Ajouter service de création avec défauts et tests de non-régression.
4. Ajouter contrats de readiness documentaire et statut catalogue.

**Gate**: tests unitaires ciblés puis `pnpm verify:phase`.

### Phase 2 — Réglages catégorisés

1. Migrer le store sans perte et sans `batteryDodPercent`.
2. Construire navigation de catégories et champs à brouillons validés.
3. Ajouter réinitialisation par catégorie, import/export de configuration.
4. Ajouter logo, signature, aperçu et préférences projets.

**Gate**: rechargement, migration, clavier, langue et fenêtre contrainte.

### Phase 3 — Accueil et projets

1. Étendre `TopBar` avec actions secondaires accessibles.
2. Réorganiser le hero, le parcours AIO, la feuille de route et la santé catalogue.
3. Ajouter reprise du dernier projet et limite de récents.
4. Ajouter tri, duplication, import/export et conflits sur la page Projets.

**Gate**: E2E création/reprise/import et captures desktop/étroites.

### Phase 4 — Catalogue

1. Introduire les descripteurs de filtres par type de matériel.
2. Ajouter pastilles, état vide actionnable et provenance accessible.
3. Localiser onglets, colonnes, grandeurs, compteurs et pagination.
4. Étendre le statut avec version/date uniquement si sourcées.

**Gate**: tests unitaires/propriétés et E2E des trois onglets.

### Phase 5 — Rapports

1. Raccorder assets et identité à tous les documents.
2. Supprimer les identités et devises codées en dur lorsqu’une autorité existe.
3. Ajouter readiness et dialogue avant impression.
4. Vérifier A4, impression, langue et absence de débordement.

**Gate**: tests documentaires, captures A4 et `verify:phase`.

### Phase 6 — Devise, licence et à propos

1. Livrer le taux manuel exact et son historique minimal.
2. Brancher l’actualisation distante seulement après décision approuvée.
3. Afficher les états de licence ; brancher les mutations seulement après contrat.
4. Exposer version de build et changelog versionné.

**Gate**: états hors ligne, erreurs, fraîcheur et absence de faux succès.

### Phase 7 — Convergence

1. Fermer les chaînes codées directement dans le périmètre.
2. Exécuter les scénarios de `quickstart.md`.
3. Exécuter `pnpm verify`, corriger jusqu’à convergence autorisée.
4. Compléter les checklists et produire la preuve de sortie.

## Verification Strategy

| Niveau | Cible | Commande ou preuve |
|---|---|---|
| Unit | schémas, migrations, filtres, readiness, transferts | `pnpm test:unit` ciblé puis complet |
| Property | migrations, taux décimaux, filtres combinés | `pnpm test:property` |
| Integration | création, persistance, import, assets | `pnpm test:integration` |
| UI static | frontières, i18n, copy | `pnpm check:ui` |
| E2E | accueil, projets, réglages, catalogue, rapports | Playwright ciblé |
| Phase | dépôt cohérent | `pnpm verify:phase` |
| Final | convergence complète | `pnpm verify` et revue Spec Kit |

## Complexity Tracking

| Élément | Pourquoi nécessaire | Alternative rejetée |
|---|---|---|
| IndexedDB pour logo | localStorage n’est pas adapté aux binaires et quotas | base64 dans le store, fragile et non atomique |
| Ports de plateforme | navigateur et futur desktop n’ont pas les mêmes capacités fichiers | chemins absolus codés dans l’UI |
| Deux autorités de préférences | interface et réglages métier ont des cycles distincts | fusion dans un store géant à migration risquée |
| États de licence/taux | la vérité d’une capacité externe doit être représentée | boutons factices ou statut actif par défaut |

## Stop Conditions

L’implémentation s’arrête pour décision si :

- une migration du format projet public devient nécessaire ;
- aucun fournisseur de taux ou de licence n’est approuvé ;
- un comportement demandé modifie une formule ou une golden baseline ;
- une donnée historique ne possède ni unité ni signification confirmée ;
- le design proposé rend le parcours AIO moins visible ou le travail moins dense.
