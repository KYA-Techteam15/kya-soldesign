# Feature Specification: Dimensionnement détaillé et sécurité électrique

**Feature Branch**: `009-detailed-sizing-safety`  
**Created**: 2026-08-27  
**Status**: Draft for validation  
**Input**: Compléter le parcours après prédimensionnement : hypothèses économiques mieux structurées, catalogue KYA et utilisateur, choix manuel des équipements, optimisation configurable et optionnelle, protections suivant `core` version 1, puis câbles avec quatre entrées seulement.

## User Scenarios & Testing

### User Story 1 - Renseigner des hypothèses économiques compréhensibles (Priority: P1)

En tant que concepteur, je peux saisir les coûts spécifiques du PV, du stockage et des onduleurs, ainsi que leurs marges, dans des groupes lisibles. Pour le stockage, je peux soit saisir directement un coût par kWh, soit indiquer le prix d'un stockage de référence et sa capacité en kWh afin d'obtenir le même coût canonique.

**Why this priority**: Ces hypothèses alimentent le prédimensionnement et l'estimation indicative du système détaillé.

**Independent Test**: Saisir un stockage de 10 kWh coûtant 1 500 000 FCFA, constater 150 000 FCFA/kWh, enregistrer puis recharger le projet sans changement de valeur.

**Acceptance Scenarios**:

1. **Given** un projet utilisant le FCFA, **When** l'utilisateur saisit 10 kWh et 1 500 000 FCFA, **Then** le coût canonique enregistré est 150 000 FCFA/kWh et le calcul est expliqué.
2. **Given** une valeur propre au projet, **When** l'utilisateur restaure la valeur d'entreprise, **Then** la valeur et sa provenance changent ensemble.
3. **Given** des marges et un facteur d'émission, **When** le dialogue est affiché, **Then** les marges sont séparées des coûts techniques et le facteur d'émission est présenté dans un groupe environnemental distinct.

---

### User Story 2 - Filtrer et gérer les équipements (Priority: P1)

En tant que concepteur, je peux filtrer modules, batteries et onduleurs dans le catalogue et dans chaque sélecteur. Les données KYA sont immuables. Je peux créer mes propres références, modifier ou supprimer uniquement celles que j'ai créées, et dupliquer toute référence KYA ou utilisateur pour produire une copie utilisateur indépendante.

**Why this priority**: Le dimensionnement manuel et l'optimisation ne peuvent être fiables sans un catalogue explicite, validé et maîtrisé.

**Independent Test**: Dupliquer une référence KYA, modifier la copie, vérifier que l'original reste identique et que les mêmes filtres retrouvent la copie dans le catalogue et le sélecteur.

**Acceptance Scenarios**:

1. **Given** une référence KYA, **When** l'utilisateur ouvre ses actions, **Then** modifier et supprimer sont indisponibles, tandis que dupliquer est disponible.
2. **Given** une référence utilisateur, **When** l'utilisateur la modifie avec des valeurs valides, **Then** la nouvelle version est persistée sans altérer les instantanés déjà utilisés par des projets.
3. **Given** une référence incomplète sur un champ critique, **When** elle est consultée, **Then** elle reste identifiable mais son inéligibilité au calcul et les champs manquants sont visibles.
4. **Given** des filtres actifs, **When** l'utilisateur passe du catalogue au sélecteur d'une même famille, **Then** les critères et leur signification restent cohérents.

---

### User Story 3 - Dimensionner manuellement le système (Priority: P1)

En tant que concepteur, je choisis explicitement un module, une batterie et un onduleur. Le logiciel calcule les configurations série/parallèle, vérifie les contraintes et présente les valeurs requises et obtenues. Ce parcours manuel est le comportement par défaut.

**Why this priority**: L'utilisateur doit conserver la maîtrise de ses choix ; l'optimisation ne doit jamais devenir une étape obligatoire.

**Independent Test**: Choisir trois références compatibles et obtenir une configuration déterministe avec quantités, tensions, puissances, stockage et diagnostics traçables.

**Acceptance Scenarios**:

1. **Given** trois références calculables, **When** l'utilisateur lance le dimensionnement manuel, **Then** les configurations PV, batterie et onduleur sont calculées à partir de ces références uniquement.
2. **Given** une incompatibilité, **When** le calcul est lancé, **Then** aucune configuration fictive n'est affichée et chaque contrainte violée est expliquée.
3. **Given** un résultat valide, **When** une référence ou une cible de prédimensionnement change, **Then** le résultat devient obsolète jusqu'à un nouveau calcul.

---

### User Story 4 - Optimiser uniquement à la demande (Priority: P2)

En tant que concepteur, je peux activer une recherche optimisée, définir pour chaque famille une référence imposée, une liste autorisée ou un choix libre, puis choisir l'objectif : proximité du prédimensionnement, coût principal estimé ou nombre minimal de composants. Je compare plusieurs solutions avant d'en appliquer une.

**Why this priority**: L'optimisation apporte de la valeur sans retirer le contrôle ni masquer les compromis.

**Independent Test**: Imposer un onduleur, autoriser deux batteries, laisser les modules libres et vérifier que toutes les propositions respectent exactement ce champ de recherche.

**Acceptance Scenarios**:

1. **Given** l'optimisation désactivée, **When** l'utilisateur dimensionne, **Then** aucune recherche catalogue globale n'est exécutée.
2. **Given** une configuration de recherche, **When** l'optimisation est lancée, **Then** seules les références autorisées sont examinées et toutes les contraintes électriques obligatoires restent actives.
3. **Given** plusieurs solutions valides, **When** les résultats sont affichés, **Then** au moins les meilleures solutions distinctes sont comparables par dimensions, écarts, quantités, coût indicatif et justification du classement.
4. **Given** une solution proposée, **When** l'utilisateur la sélectionne, **Then** elle n'est appliquée au projet qu'après confirmation explicite.

---

### User Story 5 - Choisir le type et le calibre des protections (Priority: P2)

En tant que concepteur, pour chaque tronçon je choisis explicitement le type de protection parmi les options proposées par le logiciel, puis je sélectionne un calibre compatible dans la série normalisée. Le logiciel suit le principe de calcul de `core` version 1 sans introduire de catalogue commercial.

**Why this priority**: Le type de protection est un choix d'ingénierie de l'utilisateur ; il ne doit pas être attribué silencieusement.

**Independent Test**: Sur le tronçon PV–onduleur, choisir entre fusible gPV et disjoncteur DC, constater des plages et calibres compatibles recalculés, puis enregistrer le type et le calibre retenus.

**Acceptance Scenarios**:

1. **Given** le tronçon PV–onduleur, **When** les exigences sont calculées, **Then** l'utilisateur peut choisir explicitement fusible gPV ou disjoncteur DC avant de confirmer un calibre.
2. **Given** le tronçon onduleur–batterie, **When** les exigences sont calculées, **Then** l'utilisateur peut choisir explicitement fusible gG ou disjoncteur DC et le nombre de conducteurs protégés prévu par la méthode.
3. **Given** le tronçon onduleur–charges, **When** les exigences sont calculées, **Then** le disjoncteur AC est présenté comme l'option admissible et doit être confirmé par l'utilisateur.
4. **Given** un type choisi, **When** les calibres sont proposés, **Then** seuls ceux compris dans toute la plage admissible sont validables ; la borne maximale n'est jamais ignorée.
5. **Given** une modification amont, **When** les exigences changent, **Then** l'ancien choix est marqué à revalider et n'est pas conservé silencieusement comme conforme.

---

### User Story 6 - Dimensionner les câbles à partir de quatre entrées (Priority: P2)

En tant que concepteur, je saisis uniquement la longueur, le matériau, le mode de pose et la chute de tension maximale autorisée pour chaque tronçon. Le courant, le calibre de protection, les sections, la chute réelle et l'état sont des sorties non modifiables.

**Why this priority**: Une séparation stricte entre données saisies et résultats évite les incohérences dans un logiciel d'ingénierie commercial.

**Independent Test**: Modifier successivement les quatre entrées d'un tronçon et vérifier que les sorties se recalculent sans rendre un résultat éditable.

**Acceptance Scenarios**:

1. **Given** une protection validée, **When** les quatre entrées câble sont complètes, **Then** le logiciel fournit section minimale, section normalisée, chute réelle, contrainte déterminante et conformité.
2. **Given** une entrée manquante ou invalide, **When** le calcul est demandé, **Then** les sorties restent indisponibles avec une raison ciblée.
3. **Given** un changement de type ou calibre de protection, **When** le câble est recalculé, **Then** le courant de dimensionnement dépend du choix retenu.

### Edge Cases

- Le prix ou le stockage de référence vaut zéro, est négatif ou dépasse les limites de saisie.
- Une conversion assistée produit une valeur non représentable dans l'unité monétaire du projet.
- Un composant utilisateur est modifié alors qu'un projet conserve une ancienne version.
- Une liste autorisée devient vide ou contient uniquement des références non calculables.
- Aucun triplet d'équipements ne satisfait toutes les contraintes obligatoires.
- Deux solutions possèdent exactement les mêmes écarts, coût et nombre de composants.
- Un coût spécifique manque : la solution reste dimensionnable mais l'objectif « coût minimal » est indisponible pour le champ concerné.
- La plage admissible d'une protection ne contient aucun calibre normalisé.
- Le calibre calculé dépasse la plus grande valeur normalisée disponible.
- L'utilisateur change le type de protection après avoir dimensionné le câble.
- La chute maximale saisie conduit à une section supérieure à toutes les sections normalisées.
- Une valeur historique de projet ne possède ni origine ni version de catalogue.

## Requirements

### Functional Requirements

#### Hypothèses économiques

- **FR-001**: Le système MUST regrouper séparément les hypothèses PV, stockage, onduleur et environnement.
- **FR-002**: Le système MUST accepter un coût spécifique direct pour chaque famille principale dans la devise active et l'unité canonique affichée.
- **FR-003**: Le système MUST permettre de calculer le coût spécifique du stockage à partir d'un prix total et d'un stockage strictement positif en kWh, sans demander tension ni capacité en Ah.
- **FR-004**: Le système MUST conserver le coût spécifique comme valeur canonique, indépendamment du mode de saisie.
- **FR-005**: Le système MUST distinguer coût technique, marge commerciale et facteur d'émission, avec provenance valeur d'entreprise ou surcharge projet.
- **FR-006**: Toute conversion monétaire MUST utiliser des montants entiers dans l'unité monétaire minimale et une règle d'arrondi visible.

#### Catalogue et filtres

- **FR-007**: Les listes et sélecteurs MUST proposer des filtres adaptés à chaque famille et partager la même définition des critères.
- **FR-008**: Les filtres module MUST couvrir au minimum fabricant, technologie et plage de puissance.
- **FR-009**: Les filtres batterie MUST couvrir au minimum fabricant, technologie, tension, capacité ou énergie.
- **FR-010**: Les filtres onduleur MUST couvrir au minimum fabricant, type, puissance, tension DC et compatibilité PV/MPPT lorsqu'elle est connue.
- **FR-011**: Toute donnée KYA MUST être non modifiable et non supprimable.
- **FR-012**: L'utilisateur MUST pouvoir créer, modifier, supprimer et dupliquer ses propres références.
- **FR-013**: L'utilisateur MUST pouvoir dupliquer une référence KYA en une nouvelle référence utilisateur indépendante liée à son origine.
- **FR-014**: Une modification de catalogue MUST créer une nouvelle version sans modifier les instantanés déjà enregistrés dans les projets.
- **FR-015**: Les formulaires MUST valider les relations électriques essentielles et indiquer précisément chaque champ bloquant.
- **FR-016**: Une référence incomplète MUST être marquée non calculable plutôt que complétée par un défaut silencieux.

#### Dimensionnement manuel et estimation

- **FR-017**: Le dimensionnement manuel MUST être le parcours par défaut.
- **FR-018**: Le calcul manuel MUST utiliser exactement les trois références confirmées par l'utilisateur.
- **FR-019**: Le moteur MUST calculer les quantités série/parallèle et vérifier toutes les contraintes électriques applicables.
- **FR-020**: Les valeurs requises, obtenues, marges, diagnostics, version de méthode et hash des entrées MUST accompagner le résultat.
- **FR-021**: Toute entrée déterminante modifiée MUST rendre le résultat et ses dépendances aval obsolètes.
- **FR-022**: Le système MUST estimer le coût des équipements principaux à partir des dimensions obtenues et des coûts spécifiques du prédimensionnement.
- **FR-023**: L'estimation MUST identifier explicitement son périmètre et ne pas se présenter comme l'évaluation financière complète.

#### Optimisation optionnelle

- **FR-024**: L'optimisation MUST rester désactivée jusqu'à une action explicite de l'utilisateur.
- **FR-025**: Pour module, batterie et onduleur, l'utilisateur MUST choisir un champ de recherche parmi référence imposée, liste autorisée et choix libre.
- **FR-026**: Les contraintes de sécurité et de compatibilité MUST rester obligatoires quel que soit l'objectif choisi.
- **FR-027**: L'utilisateur MUST pouvoir choisir proximité du prédimensionnement, coût principal estimé ou nombre minimal de composants.
- **FR-028**: L'utilisateur MAY définir une limite maximale de surdimensionnement distincte pour PV, stockage et onduleur.
- **FR-029**: Pour chaque combinaison admissible, le système MUST calculer les écarts relatifs PV, stockage utile et puissance onduleur.
- **FR-030**: L'objectif proximité MUST minimiser successivement le plus grand écart, la somme des écarts, le coût disponible puis le nombre de composants.
- **FR-031**: L'objectif coût MUST être disponible uniquement lorsque tous les coûts nécessaires sont présents et comparables.
- **FR-032**: L'objectif nombre minimal MUST départager les égalités par proximité puis coût disponible.
- **FR-033**: Le classement MUST être déterministe avec un dernier départage stable et documenté.
- **FR-034**: Le système MUST présenter plusieurs meilleures solutions distinctes lorsque disponibles et expliquer leur classement.
- **FR-035**: Aucune solution optimisée MUST être appliquée sans confirmation explicite.

#### Protections suivant la version 1

- **FR-036**: Le système MUST calculer par tronçon la plage de courant admissible, la tension de service requise et la quantité selon les règles versionnées issues du principe de `core` version 1.
- **FR-037**: Le système MUST proposer uniquement les types admissibles au tronçon : gPV ou disjoncteur DC pour PV–onduleur, gG ou disjoncteur DC pour onduleur–batterie, disjoncteur AC pour onduleur–charges.
- **FR-038**: L'utilisateur MUST sélectionner et confirmer explicitement le type de protection pour chaque tronçon ; aucune sélection silencieuse n'est autorisée.
- **FR-039**: Après le choix du type, le système MUST afficher dans un tableau les exigences, les calibres normalisés compatibles, le calibre retenu et la quantité.
- **FR-040**: L'utilisateur MUST choisir le calibre parmi les calibres compatibles proposés.
- **FR-041**: Le filtrage MUST respecter les bornes minimale et maximale de la plage lorsqu'elles existent.
- **FR-042**: Si aucun calibre normalisé n'est compatible, le résultat MUST rester indisponible avec un diagnostic ; aucune valeur calculée hors série ne peut être validée silencieusement.
- **FR-043**: Cette tranche MUST NOT introduire fabricant, modèle, prix, CRUD ou catalogue commercial de protections.

#### Câbles

- **FR-044**: Les seules entrées câble modifiables par tronçon MUST être longueur, matériau, mode de pose et chute de tension maximale autorisée.
- **FR-045**: Courant, tension, calibre de protection, section minimale, section normalisée, chute réelle, contrainte déterminante et état MUST être des sorties non modifiables.
- **FR-046**: Le calcul câble MUST dépendre du type et du calibre de protection confirmés.
- **FR-047**: Le résultat MUST distinguer au minimum la contrainte thermique et la contrainte de chute de tension, puis retenir la section normalisée couvrant la plus contraignante.
- **FR-048**: Une modification d'une entrée câble ou d'une protection amont MUST invalider et recalculer les sorties concernées.

#### Transversal

- **FR-049**: Tous les calculs MUST rester indisponibles avec une raison explicite lorsque les entrées indispensables manquent.
- **FR-050**: Les données, choix, résultats et états d'obsolescence MUST être restaurés après rechargement du projet.
- **FR-051**: Tous les libellés, erreurs, unités et aides MUST être disponibles en français et en anglais.
- **FR-052**: Tous les tableaux, filtres, dialogues et choix MUST être utilisables au clavier et ne pas transmettre leur sens par la couleur seule.

### Key Entities

- **EconomicAssumptions**: coûts spécifiques canoniques, marges, facteur d'émission, devise et provenance.
- **StorageCostConversion**: prix total, stockage de référence en kWh, coût spécifique résultant et règle d'arrondi.
- **EquipmentRecord**: référence module, batterie ou onduleur, origine KYA/utilisateur, version, ascendance, état de calculabilité et caractéristiques.
- **EquipmentSnapshot**: copie immuable des caractéristiques effectivement utilisées dans un calcul de projet.
- **SelectionScope**: mode imposé, liste autorisée ou libre pour une famille.
- **SizingRun**: cibles, instantanés, configuration, résultats, diagnostics, trace, version et hash.
- **OptimizationRequest**: activation, champs de recherche, objectif et limites de surdimensionnement.
- **OptimizationCandidate**: solution valide classée, écarts, coût indicatif, quantités et justification.
- **ProtectionRequirement**: tronçon, types admissibles, courant minimal/maximal, tension et quantité.
- **ProtectionChoice**: type explicitement confirmé, calibre normalisé et état de validation.
- **CableInput**: longueur, matériau, mode de pose et chute maximale d'un tronçon.
- **CableResult**: courant, sections, chute réelle, contrainte déterminante, conformité et trace.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100 % des conversions de coût de stockage testées donnent le même coût canonique qu'une saisie directe à la règle d'arrondi documentée.
- **SC-002**: 100 % des tentatives de modification ou suppression d'une référence KYA sont empêchées, tandis qu'une duplication produit une référence utilisateur indépendante.
- **SC-003**: Un utilisateur peut retrouver une référence par filtres et terminer un dimensionnement manuel valide en moins de 3 minutes sur le jeu de démonstration.
- **SC-004**: 100 % des solutions optimisées respectent le champ de recherche configuré et toutes les contraintes électriques obligatoires.
- **SC-005**: Deux exécutions avec les mêmes entrées produisent le même classement et les mêmes résultats.
- **SC-006**: Pour chaque candidat affiché, l'utilisateur peut retrouver les trois écarts, le coût indicatif ou sa cause d'indisponibilité, et la raison du classement.
- **SC-007**: Pour 100 % des tronçons, aucun calibre ne peut être confirmé avant le choix explicite du type de protection.
- **SC-008**: 100 % des calibres validables appartiennent à la série normalisée et à toute la plage admissible calculée.
- **SC-009**: Les écrans câble n'exposent exactement que quatre catégories d'entrées par tronçon ; toutes les autres valeurs calculées sont non modifiables.
- **SC-010**: Après rechargement, 100 % des projets de test restaurent choix, versions, résultats valides et états obsolètes sans mutation silencieuse.
- **SC-011**: Les scénarios critiques possèdent des tests unitaires, de limites, d'invariants et des cas de référence revus avant validation de la phase.

## Assumptions

- Le prédimensionnement fournit des minima cohérents de puissance PV, stockage utile et puissance onduleur.
- Le coût de stockage assisté est défini par prix total divisé par stockage nominal de référence en kWh ; la profondeur de décharge n'est pas une entrée de ce calcul économique.
- L'estimation avant finance couvre d'abord les modules, batteries et onduleurs ; câbles, protections, installation, transport, taxes et accessoires restent explicitement hors total tant qu'ils ne possèdent pas de coût approuvé.
- Les valeurs par défaut et bornes numériques seront versionnées avec une provenance ; aucune valeur historique non sourcée ne devient normative par simple migration.
- Les principes de `core` version 1 servent de référence fonctionnelle pour les types, plages et séries de protection, mais ses requêtes incomplètes et incohérences ne sont pas reproduites.
- La validation scientifique des formules et séries normalisées est obligatoire avant leur qualification comme règles de production.

## Out of Scope

- Évaluation financière complète, flux de trésorerie, financement, taxes détaillées et LCOE.
- Catalogue commercial des protections avec fabricant, modèle, prix ou pouvoir de coupure.
- Mise à la terre, parafoudres, coffrets, schéma unifilaire et nomenclature commerciale complète.
- Ajout de nouvelles topologies de système, raccordement réseau ou groupe diesel.
- Installation Tauri, synchronisation cloud et acquisition de données réseau.
