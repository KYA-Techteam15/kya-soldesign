# Goal AIO-001-IMPL — Implémentation contrôlée du cœur AIO par Terra

## Objectif

Implémente **strictement** la spécification convergée `specs/003-aio-core/` et rien d'autre. La spécification, les sources, les formules, les contrats, les tests et les frontières sont décidés par Sol High. Terra réalise le code, les tests et les gates.

## Sources d'autorité, dans cet ordre

1. `AGENTS.md` et `.specify/memory/constitution.md`.
2. `specs/003-aio-core/spec.md`.
3. `specs/003-aio-core/research.md` et `contracts/calculation-register.md`.
4. `specs/003-aio-core/data-model.md`, `contracts/engine-api.md`, `plan.md`, `tasks.md`, `quickstart.md`.

Le legacy parent est uniquement une comparaison de migration déjà documentée; ne l'importe pas et ne change aucune formule à partir de lui.

## Exécution imposée

1. Lire tous les artefacts cités avant la première écriture.
2. Suivre `T001` à `T020` dans l'ordre, avec tests avant chaque formule. Cocher une tâche seulement après preuve verte.
3. Implémenter exclusivement `CALC-AIO-001` à `CALC-AIO-007`, dans le domaine et les unités indiqués. Ne pas remplacer un champ inconnu par une valeur usuelle.
4. Mettre le moteur pur dans `packages/engine`; réutiliser et composer les unités, `LoadItem`, `NormalizedHourlyProfile`, météo, provenance, `CalculationEnvelope` et `CalculationEngine` déjà livrés par DATA-001. N'ajouter un type que si `data-model.md` le désigne comme un écart réel. Sérialisable, déterministe, sans React, DOM, Tauri, réseau, temps, locale, stockage, environnement mutable, parent ou Python.
5. Ne modifie pas `apps/desktop`, `ROADMAP.md`, les dossiers parents, les catalogues, les formats publics existants, ni les goldens/sources sans approbation humaine explicite.
6. Après chaque phase, exécuter `pnpm verify:phase`. Diagnostiquer/réparer au maximum trois itérations de portée AIO; ne pas continuer sur gate rouge.
7. Terminer par `$ksd-calculation-test`, `$ksd-spec-audit`, `pnpm verify`, puis `$speckit-converge`. Mettre à jour `specs/003-aio-core/convergence.md` avec les commandes, résultats et le statut final.

## Stop obligatoire — demander à Sol High/utilisateur, ne pas décider

- une nouvelle formule, une formule différente ou un changement de source;
- une modification de golden ou de format public;
- une chimie batterie autre que plomb pour une capacité nominale;
- une conversion ambiguë des valeurs UI (notamment `batteryEfficiencyRatio`);
- l'ajout de simulation, matériel, sûreté, finance, CO₂ ou documents;
- une donnée météo/profil facture manquante qu'il faudrait inventer.

## Définition de terminé

Le code respecte tous les contrats AIO, chaque sortie contient version/hash/provenance/warnings/contraintes/traces, tous les tests requis sont verts, les tâches sont cochées avec preuves, et `$speckit-converge` est vert. Terra s'arrête alors, sans démarrer l'intégration UI : celle-ci fera l'objet d'un objectif distinct.
