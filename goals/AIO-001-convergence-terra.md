# Goal AIO-001-CONVERGE — Corriger et terminer le cœur AIO par Terra

## Objectif

Reprendre l'implémentation du commit `565d646` et fermer strictement les écarts de convergence `T022` à `T027` dans `specs/003-aio-core/tasks.md`. Ne commence pas `UI-AIO-001`. Le golden scientifique `T021` reste une porte humaine séparée : ne le crée pas, ne le modifie pas et ne coche aucune tâche `G-*` sans approbation explicite.

## Autorités, dans l'ordre

1. `AGENTS.md` et `.specify/memory/constitution.md`.
2. `specs/003-aio-core/spec.md`.
3. `specs/003-aio-core/research.md` et `contracts/calculation-register.md`.
4. `specs/003-aio-core/data-model.md`, `contracts/engine-api.md`, `plan.md`, `tasks.md`, `quickstart.md`.
5. Le code et les tests DATA-001 déjà versionnés avant `565d646`, notamment `packages/engine/src/engine.ts`, sont des contrats à préserver.

## Corrections imposées

1. Restaure exactement le protocole générique `CalculationEngine.calculate(...): Promise<CalculationEnvelope<...>>`. Ne change aucun format public DATA-001. `AioSizingEngineV1` ajoute `calculateSync`; la méthode async générique appelle ce même cœur pur.
2. Supprime l'usage de `AIO_INVALID_HOURLY_SERIES` comme fallback universel. Classe chaque issue Zod selon son chemin et bloque seulement les sorties dépendantes décrites dans `contracts/engine-api.md`.
3. Une série horaire invalide bloque énergie/pic/DC/PV/stockage/onduleur, mais n'empêche pas une PSH valide. Un événement startup invalide bloque surge seulement. Une ressource solaire invalide bloque PSH/PV seulement. Une hypothèse invalide est équivalente à absente pour ses descendants. Un contexte technique invalide non utilisé conserve les résultats indépendants et expose sa contrainte. Une provenance invalide bloque toutes les sorties.
4. Aucune entrée métier invalide, y compris `NaN`/`Infinity`, ne doit faire lever `calculate` ou `calculateSync`. Retourne une enveloppe JSON sérialisable et déterministe. Un input non canonique reçoit un identifiant diagnostique explicitement distinct d'un `inputHash` technique valide.
5. Conserve exclusivement `CALC-AIO-001` à `CALC-AIO-007`. Aucune formule, source, unité, chimie supplémentaire, simulation, équipement, sûreté, finance, CO₂, document ou UI.
6. Ajoute d'abord les tests de contrat, frontières et propriétés. Couvre au minimum les cas reproduits par l'audit : latitude `91`, `startupEvents.hourIndex=24`, PR `NaN`, provenance SHA invalide, série de longueur différente de 24, ressource POA invalide et chaque hypothèse invalide.
7. Vérifie que contraintes, warnings, traces, provenance et sorties ont un ordre déterministe et aucun doublon. Vérifie que toutes les sorties disponibles ont exactement une unité et au moins une trace formule/source.
8. Aligne `tasks.md`, le registre et `convergence.md` avec les chemins réels des tests. Ne prétends pas que les goldens AIO sont verts : `test-data/golden/manifest.json` est vide tant que l'utilisateur n'a pas approuvé une baseline.

## Frontières absolues

- Ne modifie pas `apps/desktop`, `ROADMAP.md`, les catalogues, les formats projet, les sources scientifiques, le manifeste golden, les dossiers parents ou le legacy.
- Ne touche pas `goals/UI-AIO-001-specification-sol.md`.
- Ne change pas le design ni le contrat UI.
- N'invente aucune donnée technique et aucun résultat attendu scientifique.

## Gates

Après chaque groupe de correction, exécute `pnpm verify:phase`. À la fin, exécute dans l'ordre :

1. `$ksd-calculation-test` ;
2. `$ksd-spec-audit` ;
3. `pnpm test:unit` ;
4. `pnpm test:property` ;
5. `pnpm test:golden` ;
6. `pnpm verify` ;
7. `$speckit-converge`.

Corrige uniquement dans le périmètre AIO, au maximum trois cycles par gate rouge. Si le seul finding restant est le golden humain T021, rapporte le statut `code convergé / feature en attente d'approbation golden`, sans démarrer la suite.

## Rapport final attendu

Retourne : les écarts corrigés, la matrice contrainte → sorties bloquées, les tests ajoutés, les commandes et résultats exacts, le résultat de convergence, le commit et le push. Confirme expressément que l'UI, les formats publics DATA-001, les sources et les goldens n'ont pas été modifiés.
