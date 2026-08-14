# Spécification — UI AIO, tranche Page 1

**Roadmap** : `UI-AIO-001`
**Tranche d'exécution** : `UI-AIO-001A-PAGE1`
**Statut** : en cours de convergence

## But

Faire de Site/Météo et Besoins une frontière d'entrée fiable pour le moteur AIO. L'interface validée est conservée; ses états prototypes et ses calculs simulés sont remplacés par les contrats canoniques et l'enveloppe AIO convergée.

## Scénarios d'acceptation

### US1 — Définir une ressource solaire traçable

L'ingénieur sélectionne une localité et une source, saisit ou importe douze irradiations POA journalières mensuelles avec leur période et provenance, fixe l'orientation et déclare le mois critique. Une orientation ou une source modifiée rend la ressource précédente périmée.

### US2 — Recenser les appareils et leurs horaires

L'ingénieur saisit plusieurs appareils classiques et inductifs, leurs grandeurs explicites et leurs 24 fractions de fonctionnement. Le système dérive une seule série de 24 énergies et les événements de démarrage sans dupliquer une énergie quotidienne éditable.

### US3 — Fournir directement un profil horaire

L'ingénieur saisit 24 puissances moyennes et 24 pointes. Chaque pointe est supérieure ou égale à la puissance moyenne; les unités W à la frontière deviennent Wh sur chaque intervalle exact d'une heure.

### US4 — Estimer depuis une facture

L'ingénieur saisit l'énergie observée, les dates ou le nombre exact de jours et choisit un profil normalisé sourcé. L'estimation conserve la même énergie journalière et annonce sa méthode et sa qualité; le compteur ne fabrique pas une pointe transitoire.

### US5 — Produire le bilan Page 1

Le mode actif est normalisé en `CanonicalDailyLoadV1`, adapté en requête AIO et calculé hors React. L'UI affiche énergie AC journalière, pic coïncident et puissance de démarrage lorsqu'ils sont disponibles, sinon les contraintes correspondantes.

## Exigences

- **FR-P1-001** — Utiliser `ProjectInputsV1` comme unique état éditable et supprimer les écritures parallèles `inputs.localityId` et `inputs.loads`.
- **FR-P1-002** — Une seule autorité de charge est active selon `profile.source`; les brouillons des autres modes peuvent être conservés mais ne participent pas au calcul.
- **FR-P1-003** — Les horaires d'appareils contiennent 24 fractions finies `[0,1]`; leur somme est la durée quotidienne.
- **FR-P1-004** — Les calculs de ligne et de normalisation vivent dans une couche pure testée, jamais dans React.
- **FR-P1-005** — L'estimation facture exige une période exacte et un `NormalizedHourlyProfile` sourcé; aucun mois conventionnel de 30 jours.
- **FR-P1-006** — La ressource solaire identifie 12 valeurs POA, orientation, période, source et provenance; inconnue et zéro restent distincts.
- **FR-P1-007** — Le mois critique est déclaré par l'utilisateur; une recommandation du minimum sourcé peut être montrée sans sélection silencieuse.
- **FR-P1-008** — Le bilan public vient exclusivement de `AioSizingEnvelopeV1` avec version, hash, warnings, contraintes et traces.
- **FR-P1-009** — Toute modification technique rend l'ancien résultat `stale`; une réponse asynchrone obsolète ne remplace jamais le projet courant.
- **FR-P1-010** — Les composants, la navigation, le clavier, FR/EN et le responsive du design validé sont préservés.

## Frontières

- `Ir_min` est stocké pour `SIM-001` mais n'influence pas AIO-001.
- `yEn`, LPSP, LOLP, SRI, simulation TMY/SOC, sélection d'équipements, finance et documents restent hors tranche.
- Le téléchargement météo live n'est pas simulé. Tant qu'un port réseau approuvé n'existe pas, l'utilisateur fournit/importera les valeurs et leur preuve.
- `UI-AIO-001B-PRESIZING` affichera les autres sorties PV, batterie et onduleur après convergence de cette tranche.

## Définition de fini

Les cinq scénarios fonctionnent après sauvegarde/rechargement en mémoire, les résultats changent avec les entrées attendues, les inconnues bloquent sans fallback, les tests couvrent les trois modes et la validation navigateur correspond au design approuvé.
