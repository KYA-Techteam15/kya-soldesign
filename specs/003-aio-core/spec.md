# Spécification — AIO Core

**Feature**: `003-aio-core`  
**Statut**: spécification prête à implémenter par Terra  
**Périmètre roadmap**: `AIO-001` (reste `planned`)

## But

Permettre à un ingénieur de produire un prédimensionnement PV autonome traçable à partir de charges, d'une ressource solaire réellement fournie et d'hypothèses explicitement admises. Le résultat est une estimation analytique, pas une preuve de fiabilité ni une sélection de matériel.

Le cœur retourne toujours un résultat sérialisable avec son identité de calcul, la provenance, les contraintes et la trace des formules. Une entrée technique absente ou contradictoire bloque uniquement la sortie qui en dépend : elle n'est jamais remplacée par une valeur usuelle.

## Clarifications et décisions résolues

- L'AIO est exclusivement un système PV autonome dont le PV est la source de charge. Les hybrides, raccordés réseau et générateurs de secours sont hors périmètre.
- Le prédimensionnement utilise une irradiation moyenne journalière du mois critique, sur le plan du champ PV, fournie avec sa provenance. Il ne fabrique ni irradiation ni TMY et n'exécute pas de simulation horaire.
- Les sorties sont des puissances/énergies minimales continues; elles ne sont ni une configuration matérielle, ni une garantie de disponibilité.
- Une charge active est représentée par une série journalière canonique de 24 énergies horaires (`hourlyEnergyWh[24]`). Un profil de puissance direct est converti par intégration sur l'intervalle; une facture ne peut devenir une série horaire qu'avec une méthode/profil sourcé et déclaré.
- La décision sur une batterie plomb est la seule formule de capacité nominale autorisée en v1, car IEEE 1562-2021 limite explicitement son domaine aux batteries plomb. Pour les autres chimies, AIO retourne le besoin d'énergie utilisable et exige une règle/fiche approuvée dans une future extension.

## Scénarios et critères d'acceptation

### US1 — Valider et normaliser des entrées d'étude (P1)

Un ingénieur fournit le projet, les charges, la ressource solaire et les hypothèses. Le système accepte seulement les données complètes, unitaires et sourcées; il expose les blocages sans substituer une valeur.

Critères:

1. Les données administratives sont exclues du hash de calcul; les données techniques et leur provenance y sont incluses.
2. Les coordonnées, l'orientation, le mois critique, l'irradiation, les rendements et l'autonomie sont validés avec leurs unités explicites.
3. Une valeur `null`, absente, hors plage ou non finie produit une contrainte stable et aucun résultat dépendant.

### US2 — Calculer les besoins et le prédimensionnement analytique (P1)

Un ingénieur obtient, à partir d'une série journalière cohérente, l'énergie journalière AC, le pic de puissance coïncident, le besoin DC, le PV STC minimal, l'énergie utile de stockage, la capacité plomb nominale et les puissances onduleur continues/démarrage.

Critères:

1. Chaque valeur expose son unité, ses entrées, son identifiant de formule et son identifiant de source.
2. Aucune sortie ne fait de choix de référence catalogue, de nombre de modules/batteries, de câble/protection ou de calcul monétaire.
3. Une charge inductive sans multiplicateur de démarrage explicite ne produit pas de puissance de démarrage silencieuse.

### US3 — Auditer et reproduire une étude (P1)

Un relecteur peut comparer deux exécutions avec le même contrat et obtenir le même `inputHash`, les mêmes sorties, avertissements, contraintes et traces, indépendamment de l'UI, de l'horloge ou du réseau.

Critères:

1. L'enveloppe publique contient `engineVersion`, `inputHash`, provenance, warnings, contraintes violées et traces.
2. Les résultats arrondis pour affichage sont séparés des valeurs canoniques; le cœur ne fait aucun arrondi d'affichage.
3. Toute trace référence une ligne du registre de calcul et une source indépendante versionnée.

## Exigences fonctionnelles

- **FR-001** — Normaliser vers les unités canoniques décrites dans `data-model.md`; refuser les conversions implicites.
- **FR-002** — Agréger les 24 énergies horaires des charges pour dériver l'énergie AC quotidienne et le pic de puissance coïncident.
- **FR-003** — Dériver les besoins DC par division explicite par le rendement d'onduleur déclaré, lorsque des charges AC existent.
- **FR-004** — Dériver la puissance PV STC minimale à partir de l'énergie DC journalière, des heures solaires de conception et du ratio de performance explicitement admis.
- **FR-005** — Dériver l'énergie de stockage utilisable pour l'autonomie déclarée; produire une capacité nominale Wh et Ah seulement si la chimie plomb, le DoD et la tension nominale sont déclarés.
- **FR-006** — Dériver les puissances d'onduleur continue et de démarrage à partir des pics de charge; signaler les multiplicateurs manquants des charges inductives.
- **FR-007** — Produire les valeurs partielles non dépendantes tout en déclarant toutes les sorties bloquées et leur cause.
- **FR-008** — Exclure strictement les résultats SIM/EQP/SAFE/FIN/DOC et les entrées qui ne servent qu'à ces domaines.
- **FR-009** — Rendre le calcul pur, déterministe, sérialisable et sans dépendance au dossier parent, à la persistance, à l'UI, au réseau, au temps ou au locale.
- **FR-010** — Associer à chaque règle retenue/corrigée un identifiant stable, ses hypothèses, sa source et une stratégie de test dans le registre.

## Entrées et sorties admises

Les contrats complets sont normatifs dans `data-model.md` et `contracts/engine-api.md`.

| Domaine | Entrée admise | Traitement AIO |
|---|---|---|
| Administratif | client, adresse, téléphone, image | hors moteur/hash; aucun effet calculatoire |
| Projet technique | type d'application, identifiant étude, site | type conservé en contexte/provenance; identifiant étude hors hash |
| Site | lat/lon, orientation, source/localité | validation/provenance; pas de modèle solaire interne |
| Météo | irradiation journalière moyenne du mois critique sur plan du champ, période, source | obligatoire pour PV; aucune valeur fabriquée |
| Charges | appareils, profil direct horaire, ou facture + profil de conversion sourcé | normalisation vers 24 `Wh`; contradictions bloquantes |
| Hypothèses AIO | rendement onduleur, PR PV, autonomie, DoD, tension, rendement batterie, marges explicites | aucune valeur par défaut; source et auteur obligatoires |
| Sorties | W, Wh, Ah, contraintes, warnings, traces | analytique et non prescriptive |

## Hors périmètre non négociable

| Feature | Reste hors AIO-001 |
|---|---|
| `SIM-001` | simulation horaire, SOC, LPSP/LOLP/SRI, TMY, disponibilité et validation de fiabilité |
| `EQP-001` | choix catalogue, compatibilité, nombre de modules/batteries, topologie |
| `SAFE-001` | câbles, sections, protections, mise à la terre |
| `FIN-001` | coûts, LCC/LCOE/SVI, rentabilité, taux, émissions/carbone |
| `DOC-001` | devis, rapport, export documentaire |

## Cas limites et erreurs

- Les 24 intervalles doivent être uniques, ordonnés et de 60 minutes; sinon la charge est invalide.
- Le maximum de puissance n'est calculable que si les charges ont une temporalité commune. Une facture mensuelle sans profil sourcé ne donne ni pic ni série horaire.
- `0 Wh/j` est valide et produit des minima nuls, mais avec le warning `AIO_ZERO_LOAD`; une charge positive avec irradiation nulle est bloquante.
- Les ratios doivent être strictement dans `(0,1]`, sauf une marge `[0,1)`; ni `0`, ni `>1`, ni pourcentage ambigu ne sont admis.
- Le point de données météo doit identifier le plan (inclinaison/azimut), la période de référence, le fuseau/convention s'il provient d'une série, et sa source.
- Une efficacité batterie « round-trip » ne vaut pas une efficacité de décharge : elle ne peut pas être transformée silencieusement en facteur de capacité.

## Résultats mesurables

- Tous les cas valides génèrent une enveloppe complète et déterministe, sans arrondi d'affichage.
- Tous les cas avec une dépendance absente exposent au moins une contrainte codée et aucune estimation de remplacement.
- 100 % des sorties quantitatives AIO possèdent une trace formule/source et une couverture de test listée dans le registre.
- Les jeux golden approuvés proviennent de calculs revus à partir des sources citées, jamais d'une copie de l'ancien Python.

## Hypothèses explicites

- Les rendements et marges constituent des hypothèses de projet, non des constantes universelles.
- L'irradiation de conception est un paramètre d'entrée traçable; AIO ne décide pas seul du mois critique.
- Les résultats sont des seuils analytiques d'avant-projet. La sélection et la preuve de fonctionnement nécessitent les features ultérieures.
