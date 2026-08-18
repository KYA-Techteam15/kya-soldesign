# Goal UI-AIO-001-SPEC — Spécifier l’intégration du moteur AIO dans l’interface validée

## Objectif

Préparer intégralement la feature roadmap `UI-AIO-001` après la convergence réelle de `AIO-001`. Sol High doit définir comment le moteur AIO TypeScript validé consomme les données existantes du projet et alimente l’atelier approuvé, sans nouvelle formule dans React, sans duplication des contrats DATA/AIO, sans valeur inventée et sans redesign.

Ce goal produit uniquement la spécification, les contrats d’adaptation, le plan de tests et l’objectif d’implémentation Terra. Il ne modifie aucune interface et n’implémente aucun adaptateur de production.

## Précondition bloquante

Ne commence pas la spécification tant que les preuves suivantes ne sont pas présentes :

1. `AIO-001` est implémenté selon `specs/003-aio-core/`.
2. Les tâches AIO sont terminées avec `pnpm verify` vert.
3. `specs/003-aio-core/convergence.md` rapporte une convergence SpecKit de code verte.
4. Le contrat public réellement exporté par `@ksd/engine` et `@ksd/domain` est stable, testé et traçable.

Si une de ces conditions manque, arrête-toi et rapporte exactement la preuve absente. Ne spécifie pas l’UI contre un moteur hypothétique.

## Autorités et ordre de lecture

1. `AGENTS.md`, `PRODUCT.md`, `.specify/memory/constitution.md`, `ROADMAP.md`.
2. Tous les artefacts convergés de `specs/001-canonical-input-data/`, `specs/002-validated-ui-foundation/` et `specs/003-aio-core/`.
3. Les exports réels de `packages/domain`, `packages/engine`, `packages/project-format` et leurs tests.
4. Les frontières UI existantes :
   - `apps/desktop/src/app/contracts.ts` ;
   - `ApplicationProvider.tsx`, `CalculationProvider.tsx`, `ProjectSessionProvider.tsx` ;
   - `app/models/projectInputs.ts`, `projectAdapters.ts`, `projectView.ts` ;
   - `features/workshop/steps/SiteStep.tsx`, `NeedsStep.tsx`, `PresizingStep.tsx` ;
   - les états de capacité, traductions et tests UI/e2e/visuels.
5. Le design validé à la révision `1be343f814abc6379517389c42e484806634e6bb`, en lecture seule, comme autorité visuelle et interactive.
6. `ksd_app` en lecture seule uniquement pour vérifier les parcours et fonctionnalités historiques de ces surfaces, jamais comme contrat, source scientifique ou dépendance runtime.

## Cycle obligatoire

Exécute le cycle Spec Kit complet `specify → clarify → plan → checklist → tasks → analyze` afin de créer `specs/004-aio-ui-integration/`.

Utilise `$ksd-spec-audit` à chaque passe documentaire et `$ksd-ui-acceptance` pour définir la matrice d’acceptation visuelle et interactive. N’exécute aucune tâche de production dans ce goal.

## Architecture d’intégration à spécifier

### 1. Une seule chaîne de données

Définis une chaîne explicite et sans duplication :

`ProjectFileV1 → validation ProjectInputsV1 → composition des contrats DATA-001 → AioSizingRequestV1 → @ksd/engine → AioSizingEnvelopeV1 → projection UI en lecture seule`.

Interdis :

- un second modèle AIO propre à React ;
- une copie des unités, charges, météo, provenance, issues ou traces ;
- toute formule ou conversion métier dans un composant ;
- les conversions `null → 0` actuellement présentes dans certaines projections UI lorsque zéro et inconnu ont des sens différents ;
- l’usage de `projectView.ts` comme autorité calculatoire ;
- l’appel direct du moteur depuis un composant React.

### 2. Adaptateur d’entrée versionné

Spécifie un adaptateur pur, testé et situé hors React, qui :

- lit le projet courant sans mutation ;
- compose les types DATA-001/AIO existants ;
- distingue données saisies, données dérivées, hypothèses et données absentes ;
- produit soit une requête AIO complète, soit une liste structurée de contraintes par champ/sortie ;
- conserve la provenance de la localité, de la météo, du profil de charge et de chaque hypothèse ;
- ne fabrique jamais irradiation POA, profil de facture, rendement, PR, autonomie, DoD, tension, chimie ou coefficient de démarrage ;
- calcule un identifiant/révision stable pour invalider un ancien résultat lorsque les entrées techniques changent.

### 3. Port de calcul existant

Spécifie l’évolution de `CalculationCapabilityPort` et de `CalculationProvider` afin que :

- la capacité `presizing` appelle l’adaptateur AIO de production ;
- le protocole async existant puisse héberger le moteur pur sans changer les formules ;
- `loading`, `error`, `empty`, `unavailable`, `stale` et `ready` restent distingués ;
- seule une enveloppe AIO validée avec `engineVersion`, `inputHash`, provenance, warnings, contraintes et traces peut être `ready` ;
- une modification des entrées rend l’ancien résultat `stale`, sans l’afficher comme actuel ;
- les autres capacités restent attachées à leurs propriétaires roadmap.

### 4. Surfaces UI concernées

Définis précisément les modifications autorisées sur les étapes existantes :

- **Projet** : contexte administratif conservé hors calcul et contexte technique transmis seulement s’il est requis.
- **Site** : localité, coordonnées, source météo, inclinaison, azimut, période/mois de conception et irradiation POA réellement fournie avec provenance.
- **Besoins** : appareils classiques/inductifs, quantité, puissance, simultanéité, horaire, profil direct et facture avec profil sourcé ; distinction zéro/inconnu.
- **Hypothèses** : uniquement les hypothèses AIO-001 nécessaires; les champs SIM/FIN restent indisponibles ou clairement attribués à leur feature.
- **Prédimensionnement** : action d’exécution réelle, validation avant calcul, états de capacité, résultats AIO autorisés, contraintes, warnings, provenance et trace consultable.
- **Dossier** : peut refléter l’existence d’une exécution AIO validée, mais ne produit aucun rapport `DOC-001`.

Les sorties LPSP, LOLP, SRI, production annuelle simulée, LCOE, SVI, CO₂, quantités d’équipement, câbles et protections restent indisponibles. Ne les remplace pas par des placeholders numériques.

### 5. Fidélité visuelle

Le design validé reste inchangé : mêmes composants, structure, densité, couleurs, typographie, interactions, navigation, FR/EN, clavier et responsive desktop. Les seules différences permises sont les états rendus nécessaires par la vérité des données et du calcul; chaque différence doit être inscrite dans un ledger et validée visuellement dans le navigateur intégré.

## Cas et décisions obligatoires

La spec doit définir sans ambiguïté :

- projet vide, charge nulle et charge invalide ;
- météo absente, source sans vraie série/POA, orientation absente ou contradictoire ;
- facture sans période ou profil sourcé ;
- charge inductive sans coefficient de démarrage ;
- hypothèse AIO absente ou sémantiquement ambiguë, notamment `batteryEfficiencyRatio` ;
- résultat partiel où certaines sorties sont disponibles et d’autres bloquées ;
- double clic/exécutions concurrentes, changement de projet pendant le calcul et réponse obsolète ;
- changement de langue, navigation ou saisie après une exécution ;
- hash identique, hash différent, moteur/version de contrat non supporté ;
- warnings et contraintes multiples, ordre déterministe et accessibilité de leur restitution ;
- absence de persistance durable tant que `DESK-001` ne l’autorise pas.

Toute décision qui modifie un contrat public, une formule/source/golden AIO ou le design validé exige l’approbation humaine. Les choix mécaniques d’adaptation et d’état UI doivent être résolus dans la spec.

## Tests à préparer avant implémentation

La spec et les tâches doivent imposer :

1. tests unitaires de l’adaptateur projet → requête AIO, notamment absence/null/zéro/invalidité ;
2. tests de contrat du port de calcul et de l’enveloppe AIO ;
3. tests d’intégration du projet jusqu’au moteur sans React ;
4. tests React des états `empty/loading/error/stale/ready/partial` et de l’accessibilité ;
5. tests e2e du parcours Projet → Site → Besoins → Hypothèses → Calcul → résultat ;
6. tests de vérité garantissant l’absence de formules UI, defaults inventés et valeurs SIM/EQP/SAFE/FIN/DOC ;
7. matrice FR/EN et visuelle à 1440 × 1000, 1024 × 768 et texte 200 % ;
8. comparaison composant par composant avec le design validé dans le navigateur intégré.

## Artefacts obligatoires

- `specs/004-aio-ui-integration/spec.md`
- `specs/004-aio-ui-integration/research.md`
- `specs/004-aio-ui-integration/data-model.md`
- `specs/004-aio-ui-integration/contracts/project-to-aio-adapter.md`
- `specs/004-aio-ui-integration/contracts/calculation-port.md`
- `specs/004-aio-ui-integration/plan.md`
- `specs/004-aio-ui-integration/checklists/requirements.md`
- `specs/004-aio-ui-integration/checklists/truthful-integration.md`
- `specs/004-aio-ui-integration/checklists/visual-acceptance.md`
- `specs/004-aio-ui-integration/tasks.md`
- `specs/004-aio-ui-integration/quickstart.md`
- `specs/004-aio-ui-integration/convergence.md`
- `goals/UI-AIO-001-implementation-terra.md`

## Frontières roadmap

- `UI-AIO-001` branche exclusivement les sorties déjà autorisées par `AIO-001`.
- `SIM-001` conserve simulation horaire, SOC, autonomie simulée, clipping, LPSP/LOLP/SRI et production temporelle.
- `EQP-001` conserve sélection, quantités et compatibilité des équipements.
- `SAFE-001` conserve câbles et protections.
- `FIN-001` conserve coûts, cash-flows, LCOE/SVI et carbone.
- `DOC-001` conserve rapports, synthèses et exports.
- `DESK-001` conserve la persistance durable et l’hébergement desktop/worker.

## Gates de clôture documentaire

1. `$ksd-spec-audit` vert.
2. `$speckit-analyze` sans finding critique/majeur.
3. Matrice exigence → entrée existante → adaptateur → port → état UI → test complète.
4. Aucune duplication DATA/AIO et aucune formule React autorisée.
5. Toutes les différences visuelles prévues sont justifiées et testables.
6. Le goal Terra référence exclusivement la spec convergée et ne lui délègue aucune décision de spécification.

## Rapport final attendu

Retourne : la chaîne de données retenue, les contrats réutilisés, les extensions réellement nécessaires, les coercitions historiques supprimées, les surfaces UI concernées, la matrice de tests, les décisions humaines restantes, le résultat d’analyse/convergence documentaire et le prompt exact à lancer avec Terra. Confirme qu’aucun code de production, aucune formule AIO, aucune UI et aucun dossier parent n’ont été modifiés.
