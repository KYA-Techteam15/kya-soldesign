# Goal AIO-001-SPEC — Audit scientifique et spécification du cœur AIO

## Objectif

Préparer intégralement la feature roadmap `AIO-001` avant toute implémentation : auditer les comportements historiques en lecture seule, établir les sources scientifiques indépendantes, définir les contrats TypeScript purs, les unités, hypothèses, contraintes, avertissements, traces et jeux de référence, puis faire converger une spec Spec Kit exécutable. Ce goal ne produit aucun calcul de production et ne modifie aucune interface.

## Contrat d’exécution

1. Travaille uniquement dans ce dépôt. `../kyasoldesign/src/ksd_app` et les autres dossiers parents sont des sources d’audit strictement en lecture seule, jamais des autorités ni des dépendances runtime.
2. Lis entièrement `AGENTS.md`, `.specify/memory/constitution.md`, `PRODUCT.md`, `ROADMAP.md`, `docs/legacy-migration.md`, les artefacts DATA-001/UI-BASE-001 et les contrats actuels de `packages/domain`, `packages/catalog`, `packages/engine` et `packages/project-format`.
3. Exécute le cycle Spec Kit `specify → clarify → plan → checklist → tasks → analyze` pour créer `specs/003-aio-core/`. N’implémente pas les tâches de calcul dans ce goal.
4. Utilise `$ksd-spec-audit` pour chaque passe d’artefacts et le skill d’audit de calcul KSD disponible. Si un skill nommé n’existe pas, documente ce manque puis réalise l’audit équivalent sans inventer de source.
5. Inventorie chaque formule historique candidate avec : emplacement, entrées, sortie, unités, hypothèses implicites, arrondis, bornes, défaut connu, usages UI et décision `retain / correct / delete / unresolved`.
6. Une formule legacy n’est jamais une preuve. Associe chaque formule retenue ou corrigée à une source scientifique/normative identifiable, sa version/date, son domaine d’application et son identifiant stable. Laisse `unresolved` toute règle non justifiable.
7. Définis un pipeline AIO minimal et explicite, sans fiabilité horaire, sélection de matériel, protections, finance ou documents : normalisation des entrées → agrégation des charges → besoins énergétiques → hypothèses AIO admises → sorties de prédimensionnement autorisées. Tout périmètre appartenant à `SIM-001`, `EQP-001`, `SAFE-001`, `FIN-001` ou `DOC-001` reste exclu.
8. Définis les contrats sérialisables TypeScript, les unités canoniques dans les noms/types, les plages valides, la gestion de l’inconnu sans défaut inventé, et l’enveloppe publique obligatoire : `engineVersion`, `inputHash`, provenance, warnings, contraintes violées et traces formule/source.
9. Prépare les tests avant implémentation : unitaires par formule/branche, limites, propriétés/invariants fast-check, golden cases revus, mutations de sensibilité et comparaisons legacy explicitement non normatives. Aucun attendu ne doit provenir uniquement de l’ancien code.
10. Établis une table de décision pour chaque ambiguïté scientifique. Résous les choix mécaniques ; arrête-toi seulement lorsqu’une décision humaine modifierait une source, une hypothèse d’ingénierie, un format public ou une baseline golden.
11. Fais passer `$speckit-converge` sur les artefacts. Implémente uniquement les corrections documentaires ajoutées et répète jusqu’à convergence verte.
12. Ne passe pas `AIO-001` à `in-progress` ou `done`, ne modifie pas `apps/desktop`, et ne commence aucune formule de production. Prépare à la fin un goal séparé `goals/AIO-001-implementation-terra.md` qui référencera exclusivement la spec convergée.

## Entrées canoniques à spécifier

### Identification du projet

- Sépare explicitement les données administratives des données techniques utiles au calcul.
- Trace le type d’application, la localisation et toute autre entrée réellement nécessaire au futur moteur.
- Définis le traitement des valeurs absentes, nulles, incomplètes ou invalides sans inventer de valeur par défaut.

### Site et météo

- Spécifie la localité canonique, les coordonnées, la source météo, sa provenance, l’inclinaison et l’azimut.
- Détermine les séries réellement nécessaires : mensuelles, horaires ou autres, ainsi que le pas de temps, le fuseau, la période et l’année de référence.
- Définis un contrat d’import ou de fourniture d’une vraie série météo, ses contrôles de qualité et son comportement en cas de données manquantes.
- Interdis explicitement toute irradiation, journée type ou production solaire fabriquée.
- Laisse en décision humaine toute convention temporelle, source ou méthode scientifique ambiguë.

### Besoins énergétiques

- Couvre les appareils classiques et inductifs : quantité, puissance nominale, rendement, coefficient de démarrage et heures d’utilisation.
- Couvre la saisie directe heure par heure, l’estimation depuis une facture, le type de réseau et les périodes de pointe.
- Couvre les granularités annuelle, mensuelle, hebdomadaire, journalière et saisonnière.
- Définis la transformation vers une série de charge canonique en distinguant strictement valeurs saisies, valeurs dérivées et résultats du moteur.
- Spécifie les erreurs, avertissements et arbitrages requis pour les données invalides, incomplètes ou contradictoires.

## Registre scientifique obligatoire

Pour chaque règle ou formule candidate, documente dans une matrice traçable :

`exigence → entrée canonique → formule/règle → unité → source → résultat → test`.

Chaque formule classée `retain` ou `correct` doit comporter sa définition mathématique, ses unités d’entrée et de sortie, ses hypothèses, son domaine de validité, une source indépendante versionnée, ses contraintes, ses avertissements, un jeu de référence et une stratégie de test. Aucun attendu ne peut être justifié uniquement par le code historique.

Pour chaque point `unresolved`, consigne le problème exact, les options possibles, leurs conséquences scientifiques et fonctionnelles, ainsi qu’une recommandation motivée. Ne tranche pas arbitrairement une unité, une convention temporelle ou une hypothèse d’ingénierie.

## Frontières roadmap

- `AIO-001` couvre uniquement le prédimensionnement autonome tout-en-un défini par la spec convergée.
- `SIM-001` conserve la simulation horaire et la fiabilité.
- `EQP-001` conserve la sélection, les quantités et la compatibilité du matériel.
- `SAFE-001` conserve les protections et les câbles.
- `FIN-001` conserve les résultats financiers.
- `DOC-001` conserve les rapports et documents.

Aucune logique de ces futures features ne doit être absorbée silencieusement dans `AIO-001`.

## Artefacts obligatoires

- `specs/003-aio-core/spec.md`
- `specs/003-aio-core/research.md` avec registre formules/sources/décisions
- `specs/003-aio-core/data-model.md`
- `specs/003-aio-core/contracts/engine-api.md`
- `specs/003-aio-core/contracts/calculation-register.md`
- `specs/003-aio-core/plan.md`
- `specs/003-aio-core/checklists/requirements.md`
- `specs/003-aio-core/checklists/scientific-evidence.md`
- `specs/003-aio-core/tasks.md`
- `specs/003-aio-core/quickstart.md`
- `specs/003-aio-core/convergence.md`
- `goals/AIO-001-implementation-terra.md`

## Conditions d’arrêt obligatoires

Arrête-toi avec une question précise si une formule requise n’a aucune source indépendante, si deux sources crédibles conduisent à des résultats incompatibles, si une unité historique est indéterminable, si une hypothèse change la sécurité ou la classe de système, ou si un golden de référence exige une décision humaine. Ne bloque pas sur la structure de fichiers, le nommage, la rédaction ou les incohérences purement mécaniques.

## Rapport de fin

Retourne le périmètre exact retenu, le nombre de formules `retain/correct/delete/unresolved`, les sources et versions, les décisions humaines encore nécessaires, la matrice exigence-formule-test-source, le résultat de convergence et le prompt exact du goal d’implémentation. Confirme qu’aucun code de calcul, aucune UI et aucun dossier parent n’ont été modifiés.
