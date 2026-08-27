# Feature Specification: Finalisation de l’expérience applicative

**Feature Branch**: `007-application-experience-completion`  
**Roadmap ID**: `APP-001`  
**Created**: 2026-08-27  
**Status**: Draft — soumis à validation avant implémentation  
**Input**: Finaliser l’accueil, le catalogue, les réglages, les projets et les rapports ; mieux classer les valeurs par défaut ; ajouter un accès rapide aux projets récents ; renforcer l’identité KYA sans dégrader l’architecture existante.

## Objectif

Transformer les écrans transversaux déjà fonctionnels en une expérience cohérente,
complète et exploitable au quotidien. La tranche conserve les calculs et le format
projet comme autorités métier, ajoute des réglages globaux versionnés, améliore la
reprise des projets, rend le catalogue plus explicite et sécurise la préparation
des documents.

L’accueil s’inspire de l’identité publique de KYA-Energy — vert et orange,
surfaces claires, promesse d’innovation, de fiabilité et d’accessibilité — sans
devenir une page marketing ni recopier le site. Les fonctions de travail restent
prioritaires sur les éléments de marque.

## État de départ confirmé

Les éléments suivants existent déjà et doivent être conservés :

- séparation entre le parcours AIO disponible et les architectures à venir ;
- liste de quatre projets récents et page de tous les projets ;
- persistance locale des projets et des préférences d’interface ;
- filtres catalogue dépendants, pagination, remise à zéro et état sans résultat ;
- réglages société, techniques et financiers appliqués aux nouveaux projets ;
- aperçu A4, logo de rapport configurable et pied de page configurable ;
- profondeur de décharge conservée dans les données projet, le catalogue et le
  moteur, mais absente des réglages globaux.

Cette tranche ne doit pas réimplémenter ces fonctions. Elle doit les compléter,
les migrer proprement si nécessaire et ajouter leurs preuves d’acceptation.

## Périmètre

### Inclus

- nouvel accueil centré sur la création et la reprise d’un projet ;
- accès « Projets récents » dans la barre supérieure de l’accueil ;
- hiérarchie distincte entre AIO disponible et feuille de route ;
- état et version du catalogue sur l’accueil et dans le catalogue ;
- catégorisation des réglages et migration versionnée des réglages existants ;
- validation des valeurs par défaut et application aux nouveaux projets ;
- import, export et duplication de projets canoniques ;
- import et export de la configuration applicative ;
- préférences de sauvegarde et nombre de projets récents ;
- devise d’entrée, devise de sortie et taux de change traçable ;
- états de licence et d’information de version derrière des ports explicites ;
- finitions des filtres, libellés et états catalogue ;
- gestion locale validée du logo de rapport et contrôle avant impression ;
- traduction française et anglaise de toutes les nouvelles chaînes ;
- navigation clavier, contraste, fenêtres contraintes et états d’erreur.

### Hors périmètre

- ajout d’une nouvelle architecture de système énergétique ;
- modification des formules, hypothèses scientifiques ou golden baselines ;
- suppression de `batteryDod` du projet, du catalogue ou du moteur ;
- authentification utilisateur, synchronisation cloud ou collaboration ;
- achat de licence ou création d’un serveur de licence ;
- invention d’un fournisseur de taux de change sans source approuvée ;
- modification silencieuse d’un projet existant lorsque les réglages changent ;
- génération d’un résultat d’ingénierie dans React.

## User Scenarios & Testing

### User Story 1 — Démarrer ou reprendre immédiatement (Priority: P1)

En arrivant sur l’accueil, un utilisateur identifie sans ambiguïté le parcours
AIO utilisable, peut créer un projet, reprendre le dernier projet ou ouvrir la
liste des projets récents depuis la barre supérieure.

**Why this priority**: c’est le point d’entrée de chaque session et le principal
gain d’efficacité attendu.

**Independent Test**: créer au moins deux projets, recharger l’application puis
vérifier que le bouton supérieur, la carte du dernier projet et la liste récente
ouvrent les bons projets sans créer de doublon.

**Acceptance Scenarios**:

1. **Given** aucun projet, **When** l’accueil s’affiche, **Then** le CTA principal crée un projet AIO et l’état vide propose aussi l’import.
2. **Given** plusieurs projets, **When** l’utilisateur choisit « Reprendre le dernier projet », **Then** le projet le plus récemment modifié s’ouvre à sa dernière route valide connue.
3. **Given** l’accueil en français ou en anglais, **When** la langue change, **Then** aucun texte métier de l’accueil ne reste dans l’ancienne langue.
4. **Given** une architecture non livrée, **When** elle est consultée, **Then** elle apparaît dans une feuille de route non interactive avec une explication et n’est pas présentée comme disponible.
5. **Given** le catalogue prêt, en chargement ou en erreur, **When** l’accueil s’affiche, **Then** son panneau de santé reflète cet état réel sans compteur inventé.

---

### User Story 2 — Configurer des valeurs par défaut compréhensibles (Priority: P1)

Un responsable configure l’identité de la société, les hypothèses par défaut et
les conditions commerciales dans des catégories explicites, avec unités, aide et
validation. Les changements s’appliquent uniquement aux futurs projets.

**Why this priority**: une valeur mal classée ou invalide affecte tous les nouveaux
dossiers et peut produire des offres incohérentes.

**Independent Test**: modifier une valeur dans chaque catégorie, recharger,
créer un projet et vérifier que le nouveau projet reçoit les valeurs tandis
qu’un projet antérieur reste inchangé.

**Acceptance Scenarios**:

1. **Given** les réglages V1 existants, **When** l’application démarre après mise à niveau, **Then** toutes les valeurs reconnues sont migrées vers V2 sans perdre l’identité ni les défauts actuels.
2. **Given** un champ numérique vide ou invalide, **When** l’utilisateur quitte le champ, **Then** une erreur contextualisée est affichée et la valeur n’est pas transformée silencieusement en zéro.
3. **Given** des réglages valides, **When** un nouveau projet est créé, **Then** un service de création applique les défauts validés une seule fois.
4. **Given** un projet existant, **When** les réglages globaux changent, **Then** aucune donnée de ce projet n’est modifiée.
5. **Given** un ancien stockage contenant `batteryDodPercent`, **When** la migration est exécutée, **Then** cette clé est ignorée et aucune valeur globale de profondeur de décharge n’est créée.
6. **Given** une réinitialisation de section ou globale, **When** l’utilisateur confirme, **Then** seules les valeurs annoncées sont réinitialisées et l’action produit un retour explicite.

---

### User Story 3 — Retrouver et transférer un projet en sécurité (Priority: P1)

Un utilisateur peut rechercher, trier, dupliquer, exporter et importer un projet
canonique sans casser les formats existants ni écraser silencieusement un autre
projet.

**Why this priority**: la récupération et la portabilité des dossiers sont des
fonctions essentielles avant tout déploiement réel.

**Independent Test**: exporter un projet, supprimer sa copie locale, le réimporter,
puis comparer le document canonique et vérifier la gestion d’un second import du
même identifiant.

**Acceptance Scenarios**:

1. **Given** un projet valide, **When** il est exporté, **Then** le fichier produit passe `parseProjectFile` et conserve sa version et sa provenance.
2. **Given** un fichier invalide, **When** il est importé, **Then** aucun projet n’est ajouté et les erreurs sont présentées sans exposer de trace technique brute.
3. **Given** un identifiant déjà présent, **When** le fichier est importé, **Then** l’utilisateur choisit explicitement entre remplacer, importer comme copie ou annuler.
4. **Given** un projet dupliqué, **When** la duplication se termine, **Then** elle reçoit un nouvel identifiant, de nouveaux horodatages et un nom distinct, sans modifier l’original.
5. **Given** une préférence de nombre de projets récents, **When** l’accueil est rechargé, **Then** la limite configurée est respectée dans les bornes autorisées.

---

### User Story 4 — Filtrer et comprendre le catalogue (Priority: P2)

Un technicien filtre le catalogue avec des libellés adaptés au type de matériel,
voit les filtres actifs et la qualité des données, puis retrouve un résultat sur
n’importe quelle page.

**Why this priority**: les filtres existent déjà ; cette tranche les rend exacts,
accessibles et explicites.

**Independent Test**: pour chaque onglet, combiner fabricant, technologie/type,
grandeur principale et tension, retirer une pastille et parcourir les pages.

**Acceptance Scenarios**:

1. **Given** l’onglet Batteries, **When** les bornes numériques sont affichées, **Then** elles sont libellées « Capacité » en Ah et filtrent `nominalCapacityAh`.
2. **Given** plusieurs filtres actifs, **When** une pastille est retirée, **Then** les options restantes et le total sont recalculés depuis les données réelles.
3. **Given** zéro résultat, **When** l’état vide apparaît, **Then** l’utilisateur peut retirer un filtre ou tout réinitialiser.
4. **Given** une valeur catalogue nulle, **When** les options sont calculées, **Then** elle est regroupée sous « Non renseigné » sans catégorie inventée.
5. **Given** une donnée de provenance, **When** la ligne reçoit le focus ou est ouverte, **Then** la source est lisible sans dépendre d’un attribut `title`.
6. **Given** aucune caractéristique de régulation dans le contrat onduleur, **When** les filtres sont affichés, **Then** aucun filtre de régulation fictif n’est proposé.

---

### User Story 5 — Préparer un rapport fiable avant export (Priority: P2)

Un utilisateur configure l’identité documentaire, prévisualise le document et
voit les informations manquantes avant d’imprimer ou d’exporter en PDF.

**Why this priority**: les documents existent déjà, mais l’export doit être
cohérent avec la société, la devise et la complétude du dossier.

**Independent Test**: charger un logo valide, ouvrir un projet incomplet puis un
projet complet, vérifier la liste de contrôle et imprimer l’aperçu dans les deux
langues.

**Acceptance Scenarios**:

1. **Given** un PNG, JPEG ou SVG sûr dans la limite configurée, **When** il est sélectionné, **Then** il est prévisualisé et conservé comme asset local distinct du logo applicatif.
2. **Given** un type, une taille ou un SVG non sûr, **When** il est sélectionné, **Then** il est refusé avec une raison et le logo précédent reste intact.
3. **Given** un rapport, **When** il s’affiche, **Then** le nom de société, le logo, la signature, le pied de page et la devise viennent des autorités configurées ou du projet.
4. **Given** des informations manquantes, **When** l’utilisateur demande l’impression, **Then** une liste distingue les blocages de validation des avertissements complétables.
5. **Given** uniquement des avertissements, **When** l’utilisateur confirme explicitement, **Then** l’impression peut continuer ; une donnée structurellement invalide reste bloquante.

---

### User Story 6 — Connaître l’état de l’application, des devises et de la licence (Priority: P3)

Un administrateur voit la version de l’application, le changelog, la devise et
le taux utilisés ainsi que l’état réel de la licence et des éventuels services
distants.

**Why this priority**: ces informations améliorent l’exploitation, mais elles ne
doivent pas retarder les parcours locaux essentiels.

**Independent Test**: exécuter l’application sans fournisseur distant, avec un
taux manuel, puis avec des adaptateurs de test simulant succès, expiration et
erreur réseau.

**Acceptance Scenarios**:

1. **Given** aucun fournisseur de taux approuvé, **When** la section Devise s’affiche, **Then** la saisie manuelle fonctionne et l’actualisation distante est indiquée indisponible.
2. **Given** un taux, **When** il est utilisé, **Then** sa valeur décimale, sa source, sa date et les deux codes ISO sont persistés et visibles.
3. **Given** aucun service de licence configuré, **When** la section Licence s’affiche, **Then** elle indique « non configuré » et ne prétend pas que la licence est active.
4. **Given** un adaptateur de licence, **When** son état change, **Then** l’édition, l’expiration, l’activation/désactivation et les erreurs sont représentées par des états contractuels.
5. **Given** une version construite, **When** À propos s’affiche, **Then** la version et le changelog proviennent de métadonnées de build ou de fichiers versionnés, jamais d’un texte recopié dans le composant.

## Edge Cases

- `localStorage` ou IndexedDB est indisponible, saturé ou contient du JSON corrompu.
- Une migration V1 est interrompue ; le stockage source doit rester récupérable.
- Une valeur numérique utilise virgule ou point selon la langue.
- Une valeur pourcentage dépasse sa borne métier ou un coût devient négatif.
- Le code devise n’a pas exactement trois lettres ISO majuscules.
- Le taux vaut zéro, est négatif, trop ancien ou relie deux devises identiques.
- La liste de projets contient des dates invalides ou un projet rejeté par le parseur.
- Un import porte le même identifiant et le même contenu qu’un projet existant.
- Un export est demandé dans un navigateur sans accès à un dossier persistant.
- Le logo est trop grand, corrompu, transparent, inaccessible ou supprimé après configuration.
- Le catalogue charge lentement, échoue ou n’expose pas de métadonnée de version.
- Une page de pagination devient inexistante après retrait d’un filtre.
- La dernière route d’un projet pointe vers une section supprimée ou indisponible.
- L’application est utilisée dans une fenêtre étroite, au clavier ou avec réduction des animations.
- Le service distant répond après que l’utilisateur a choisi un taux manuel plus récent.

## Requirements

### Functional Requirements

#### Accueil et navigation

- **FR-001**: L’accueil MUST afficher une action principale « Nouveau projet » et une action « Projets récents » dans la barre supérieure.
- **FR-002**: « Projets récents » MUST ouvrir `/accueil/projets` et annoncer de manière accessible le nombre de projets disponibles.
- **FR-003**: L’accueil MUST proposer « Reprendre le dernier projet » uniquement lorsqu’un projet valide existe.
- **FR-004**: La reprise MUST ouvrir la dernière route valide connue du projet ou, à défaut, sa section Projet.
- **FR-005**: Le parcours AIO disponible MUST avoir une hiérarchie visuelle supérieure aux architectures non disponibles.
- **FR-006**: Les architectures non disponibles MUST être regroupées dans une feuille de route, rester non actionnables et expliquer leur statut.
- **FR-007**: L’état vide MUST permettre de créer ou d’importer un projet et décrire le parcours AIO.
- **FR-008**: L’accueil MUST afficher l’état réel du catalogue, ses compteurs acceptés, ses avertissements et sa version lorsqu’elle est connue.
- **FR-009**: Les éléments de marque MUST utiliser les tokens existants et rester compatibles clair, sombre et intensités visuelles.

#### Réglages et valeurs par défaut

- **FR-010**: La page Réglages MUST présenter les catégories Interface, Société et rapports, Fiabilité et dimensionnement, Coûts des équipements, Conditions commerciales, Fichiers et projets, Devise, Licence et À propos.
- **FR-011**: Chaque champ MUST présenter un libellé, une unité, une aide courte et son état de validation.
- **FR-012**: Les réglages applicatifs MUST être persistés dans un format V2 versionné et validé à la lecture.
- **FR-013**: Une migration atomique MUST préserver les valeurs V1 reconnues et conserver une sauvegarde récupérable tant que V2 n’est pas validé.
- **FR-014**: La clé historique `batteryDodPercent` MUST être ignorée et ne MUST pas être introduite dans V2.
- **FR-015**: Une saisie vide ou invalide MUST rester un brouillon et ne MUST pas être convertie implicitement en zéro.
- **FR-016**: Les valeurs par défaut MUST être appliquées par un service dédié uniquement lors de la création d’un projet.
- **FR-017**: Modifier ou réinitialiser les réglages MUST NOT modifier les projets existants.
- **FR-018**: Les bornes, unités et règles de chaque défaut MUST être centralisées dans un schéma testable, et non dupliquées dans les composants.
- **FR-019**: L’utilisateur MUST pouvoir réinitialiser une catégorie ou l’ensemble après confirmation.
- **FR-020**: Le nombre de projets récents MUST être configurable entre 1 et 12, avec 4 par défaut.
- **FR-021**: La configuration MUST pouvoir être exportée et importée dans un format versionné, sans inclure les secrets ni les données de licence privées.

#### Projets et fichiers

- **FR-022**: La page Projets MUST permettre recherche, tri, ouverture, duplication, export, import et suppression confirmée.
- **FR-023**: Tout projet importé MUST passer le parseur public `parseProjectFile` avant mutation du stockage.
- **FR-024**: Un conflit d’identifiant MUST demander remplacer, copier ou annuler ; aucun choix implicite n’est autorisé.
- **FR-025**: Une copie MUST recevoir un nouvel identifiant et de nouveaux horodatages, tout en conservant les entrées métier.
- **FR-026**: L’export MUST produire le format public canonique sans état UI privé.
- **FR-027**: Les capacités de fichiers MUST passer par un port de plateforme ; le navigateur télécharge/téléverse et l’hôte desktop MAY mémoriser un dossier autorisé.
- **FR-028**: L’interface MUST afficher le dernier enregistrement réussi et toute erreur de persistance.
- **FR-029**: La préférence d’autosauvegarde MUST piloter une stratégie unique ; elle ne MUST pas créer deux autorités de persistance concurrentes.

#### Catalogue

- **FR-030**: Les filtres MUST rester dépendants et être recalculés à partir des résultats réels après chaque changement.
- **FR-031**: La grandeur principale MUST être Puissance Wc pour les modules, Capacité Ah pour les batteries et Puissance W pour les onduleurs.
- **FR-032**: Les filtres actifs MUST être visibles et supprimables individuellement.
- **FR-033**: L’état sans résultat MUST proposer la suppression d’un filtre et la réinitialisation complète.
- **FR-034**: Les valeurs nulles catégorielles MUST apparaître sous « Non renseigné » et les valeurs numériques nulles MUST NOT passer les filtres de bornes.
- **FR-035**: La provenance MUST être accessible au pointeur, au clavier et aux technologies d’assistance.
- **FR-036**: La pagination MUST rester dans une page valide après tout changement de filtre, de recherche ou d’onglet.
- **FR-037**: Les métadonnées catalogue MUST distinguer version connue, version inconnue, état de chargement et erreur.
- **FR-038**: Aucun filtre MUST être créé pour une propriété absente du contrat canonique.

#### Rapports

- **FR-039**: Le logo documentaire MUST être stocké comme asset local référencé, séparé du logo de l’application et des réglages textuels.
- **FR-040**: Le chargement MUST accepter uniquement PNG, JPEG et SVG assaini, avec une taille maximale de 2 MiB.
- **FR-041**: La suppression ou le remplacement du logo MUST être explicite et réversible jusqu’à validation de la nouvelle sélection.
- **FR-042**: Tous les documents MUST utiliser l’identité société configurée, la signature, le pied de page et la devise du projet.
- **FR-043**: Les chaînes `KYA-SolDesign` et `FCFA` ne MUST pas être utilisées comme identité ou devise codée en dur lorsqu’une autorité de données existe.
- **FR-044**: Avant impression, une validation MUST distinguer erreurs bloquantes et avertissements.
- **FR-045**: Les avertissements MAY être contournés après confirmation ; les contrats invalides MUST rester bloquants.
- **FR-046**: L’aperçu et le document imprimé MUST conserver la mise en page A4 en clair, indépendamment du thème de l’application.

#### Devise, licence et version

- **FR-047**: Une configuration de change MUST contenir devise source, devise cible, taux décimal exact, source, mode manuel/distant et date de mise à jour.
- **FR-048**: Les conversions monétaires MUST éviter l’accumulation en flottants binaires et respecter les unités monétaires canoniques.
- **FR-049**: La saisie manuelle MUST rester disponible hors ligne.
- **FR-050**: Une actualisation distante MUST rester indisponible tant qu’un fournisseur et sa politique d’erreur ne sont pas approuvés et documentés.
- **FR-051**: Le taux distant MUST NOT écraser un taux manuel plus récent sans confirmation.
- **FR-052**: La licence MUST être exposée via un port avec les états `unconfigured`, `checking`, `active`, `expired`, `inactive` et `error`.
- **FR-053**: Sans fournisseur de licence, l’interface MUST afficher `unconfigured` et MUST NOT simuler activation, édition ou expiration.
- **FR-054**: Les opérations d’activation et désactivation MUST exiger un contrat fournisseur approuvé avant implémentation.
- **FR-055**: La version et le changelog MUST provenir de métadonnées versionnées ou de build.

#### Qualité transversale

- **FR-056**: Toutes les nouvelles chaînes MUST exister en français et en anglais sans texte métier codé directement dans les composants.
- **FR-057**: Les actions MUST être utilisables au clavier, avoir un focus visible et des noms accessibles.
- **FR-058**: Les écrans MUST rester utilisables à 1024×700 et dans une fenêtre étroite de 760 px.
- **FR-059**: Les animations MUST respecter `prefers-reduced-motion` et ne MUST pas retarder une action métier.
- **FR-060**: Chaque mutation persistante MUST exposer succès, erreur et récupération possible.

### Key Entities

- **ApplicationSettingsV2**: configuration versionnée regroupant identité,
  défauts techniques, coûts, conditions commerciales, projets et devises.
- **UiPreferencesV1**: thème, intensité et langue ; reste propriétaire de
  l’interface mais est présenté dans la même page de réglages.
- **ProjectDefaults**: sous-ensemble validé appliqué une seule fois par le
  service de création d’un projet.
- **ProjectTransferEnvelopeV1**: enveloppe d’import/export d’un projet canonique
  avec version, horodatage et empreinte optionnelle.
- **ReportAsset**: logo ou signature documentaire validé, stocké hors du JSON de
  réglages et référencé par identifiant.
- **CatalogStatus**: état, compteurs, avertissements, version, date et provenance
  du catalogue.
- **ExchangeRateRecord**: paire ISO, taux décimal exact, mode, source, date et
  état de fraîcheur.
- **LicenseState**: état contractuel fourni par un adaptateur, sans valeur active
  par défaut.
- **ApplicationReleaseInfo**: version, canal, date de build et changelog local.

## Success Criteria

### Measurable Outcomes

- **SC-001**: depuis l’accueil, créer un projet ou reprendre le dernier demande au maximum deux actions.
- **SC-002**: 100 % des architectures non livrées sont visuellement secondaires et ne déclenchent aucune création.
- **SC-003**: 100 % des réglages V1 reconnus migrent vers V2 dans les tests de migration, sans création de profondeur de décharge globale.
- **SC-004**: 100 % des champs numériques refusent vide, non-fini, hors borne et unité invalide sans conversion silencieuse en zéro.
- **SC-005**: un aller-retour export/import d’un projet valide conserve toutes les entrées canoniques hors identifiant lorsqu’il est importé comme copie.
- **SC-006**: tous les filtres catalogue donnent le même ensemble qu’un filtrage de référence testé par propriétés et restent corrects après pagination.
- **SC-007**: 100 % des documents affichent la devise du projet et l’identité configurée, ou un fallback explicitement défini.
- **SC-008**: aucun état de catalogue, taux ou licence n’est affiché comme disponible quand son port répond indisponible ou erreur.
- **SC-009**: les scénarios critiques accueil, réglages, transfert, catalogue et rapport passent au clavier en français et en anglais.
- **SC-010**: `pnpm verify:phase` passe à la fin de chaque phase et `pnpm verify` passe avant fermeture de la feature.

## Assumptions

- La pile active reste `apps/desktop/src/routes/*`, montée par `App.tsx`.
- Le navigateur reste une cible supportée ; les fonctions de dossier permanent
  sont donc exprimées comme capacités de plateforme et non comme chemins forcés.
- Les projets existants utilisent `ProjectFileV1` tant qu’une modification du
  format public n’est pas explicitement approuvée.
- Les compteurs catalogue actuels sont fiables ; version et date demandent une
  extension de métadonnées, sans inventer de valeur si la source ne les fournit pas.
- La limite de logo de 2 MiB couvre les usages d’impression A4 sans stocker de
  fichiers déraisonnables dans le profil local.
- Le taux manuel constitue le minimum hors ligne. Le fournisseur distant et le
  fournisseur de licence sont des décisions externes bloquantes pour leurs
  opérations réseau, pas pour les autres user stories.

## Dependencies

- `ProjectSessionPort`, `parseProjectFile` et les adaptateurs de projet existants ;
- `CatalogProvider` et `CatalogSummary` ;
- `useUi`, le store de réglages actuel et IndexedDB pour les assets ;
- les tokens de `apps/desktop/src/styles/tokens.css` ;
- une décision ultérieure sur le fournisseur de taux distant ;
- une décision ultérieure sur l’autorité et le protocole de licence.

## Gates requiring explicit approval

- ajout ou modification d’un champ public dans `ProjectFileV1` ;
- sélection d’un fournisseur de taux distant et de ses règles de confiance ;
- sélection d’un serveur, fichier signé ou autre autorité de licence ;
- modification du comportement scientifique ou d’une golden baseline ;
- changement majeur du design validé au-delà de l’accueil décrit ici.
