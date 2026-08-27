# Feature Specification: Profils annuels, échanges de charges et données météo durables

**Feature Branch**: `008-annual-load-profiles-weather-data`  
**Roadmap ID**: `PAGE1-002`  
**Created**: 2026-08-27  
**Status**: Draft — soumis à validation avant implémentation  
**Input**: simplifier les profils saisonniers, importer et exporter les charges,
calculer le YEn annuel selon l’équation fournie, rendre la localisation et la
météo fiables en production, puis préparer leur persistance Tauri hors ligne.

## Objectif

Faire évoluer la Page 1 d’un profil journalier moyen vers une définition annuelle
auditable des besoins. L’utilisateur peut conserver un profil unique, distinguer
jours ouvrés et week-end, ou composer des périodes croisées avec ces types de
jour. Chaque combinaison possède un profil de 24 heures et contribue au facteur
annuel par pondération énergétique.

La tranche rend aussi les données de charge échangeables avec Excel, corrige le
fonctionnement réseau qui dépend actuellement du proxy Vite de développement,
conserve les téléchargements météo dans une bibliothèque durable, et prépare une
autorité SQLite unique pour l’application Tauri.

## Décisions validées par le demandeur

- supprimer le champ « Photo du site » ;
- conserver la définition du besoin par facture et supprimer uniquement son
  encadré explicatif rouge ;
- utiliser un seul fichier Excel pour les équipements classiques et inductifs ;
- distinguer un équipement inductif par son coefficient de démarrage ;
- supprimer `simultaneite_pct` de l’échange Excel et du flux métier concerné ;
- représenter les heures optionnelles par `h00` à `h23` ;
- appliquer l’algorithme horaire par défaut lorsque ces colonnes sont vides ;
- limiter un fichier de profil horaire à trois colonnes ;
- livrer trois organisations temporelles : profil unique, ouvrés/week-end et
  périodes × types de jour ;
- définir les profils non annuels uniquement par 24 valeurs saisies ou importées ;
- calculer un YEn annuel comme moyenne énergétique des facteurs locaux ;
- proposer une vue annuelle et une vue détaillée par jour ;
- supprimer les filets colorés à gauche des alertes dans le logiciel.

## Périmètre

### Inclus

- retrait de `projectImageRef` par migration explicite et lecture compatible des
  anciens projets ;
- retrait visuel de l’encadré rouge de la méthode facture, sans retirer la méthode ;
- import/export `.xlsx` des équipements consommateurs et de leurs horaires ;
- import/export d’un profil horaire à trois colonnes ;
- validation complète et aperçu avant toute mutation d’un import ;
- définition des jours ouvrés/week-end et des périodes annuelles ;
- génération des combinaisons période × type de jour ;
- saisie, import, copie et affectation des profils horaires ;
- résolution d’un profil pour chaque date locale de l’année météo ;
- calcul des facteurs locaux et du facteur annuel pondéré par énergie ;
- série annuelle de charge de 8 760 pas, avec politique explicite pour 8 784 pas ;
- visualisation annuelle agrégée et détail horaire d’une date ;
- référentiel ISO de pays embarqué avec libellés français et anglais ;
- noms de localité localisés et conservés pour utilisation hors ligne ;
- recherche locale, géocodage distant principal, stratégie de secours et saisie
  par coordonnées ;
- acquisition météo utilisable dans le serveur de développement, le déploiement
  web et la future enveloppe Tauri ;
- enregistrement atomique de la localité, de la météo et de son rattachement au
  projet ;
- suppression globale du filet gauche des alertes, sans supprimer le focus clavier.

### Hors périmètre

- suppression ou simplification de la méthode facture elle-même ;
- profil par chacun des sept jours, profil mensuel ou granularité libre `N` ;
- définition d’équipements distincts dans chaque combinaison période × jour ;
- simulation annuelle de SOC, LPSP ou LOLP ;
- synchronisation cloud ou compte utilisateur ;
- serveur généraliste inclus dans l’application web ;
- fonctionnement du téléchargement météo sans connexion réseau ;
- traduction automatique arbitraire d’un nom de ville absent des fournisseurs ;
- changement des autres formules de dimensionnement.

## User Scenarios & Testing

### User Story 1 — Échanger un inventaire d’équipements fiable (Priority: P1)

Un ingénieur exporte le tableau des équipements, le modifie dans Excel puis le
réimporte sans perdre les catégories, les durées ni les heures d’utilisation.

**Independent Test**: exporter un inventaire mixte, réimporter le fichier intact,
puis tester des cellules hors plage et un fichier sans colonnes horaires.

**Acceptance Scenarios**:

1. **Given** un inventaire classique et inductif, **When** il est exporté,
   **Then** une seule feuille contient les colonnes métier et `h00` à `h23`.
2. **Given** un coefficient de démarrage vide, **When** la ligne est importée,
   **Then** elle devient classique ; un coefficient valide la rend inductive.
3. **Given** les 24 heures vides et une durée valide, **When** l’import est
   prévisualisé, **Then** l’horaire par défaut est annoncé et généré sans blocage.
4. **Given** une valeur incorrecte, **When** le fichier est inspecté, **Then**
   toutes les erreurs indiquent feuille, cellule, valeur et règle attendue.
5. **Given** au moins une erreur bloquante, **When** l’utilisateur annule ou
   tente de confirmer, **Then** aucune ligne du projet n’est modifiée.

### User Story 2 — Importer ou saisir un profil de 24 heures (Priority: P1)

Un ingénieur définit le profil actif avec 24 puissances moyennes et de pointe,
par saisie directe ou par fichier à trois colonnes.

**Acceptance Scenarios**:

1. **Given** un fichier valide, **When** il est importé, **Then** les 24 heures
   uniques remplacent atomiquement le profil actif.
2. **Given** une heure manquante, dupliquée ou hors plage, **When** le fichier est
   inspecté, **Then** l’import est bloqué avec la cellule fautive.
3. **Given** une pointe inférieure à la moyenne, **When** le fichier est inspecté,
   **Then** la ligne est refusée et aucune correction silencieuse n’est appliquée.
4. **Given** l’interface française ou anglaise, **When** un modèle est exporté,
   **Then** il est réimportable dans l’autre langue sans modification manuelle.

### User Story 3 — Composer les usages annuels sans ambiguïté (Priority: P1)

Un utilisateur choisit profil unique, ouvrés/week-end ou périodes × types de
jour, puis définit les 24 valeurs nécessaires pour chaque combinaison.

**Acceptance Scenarios**:

1. **Given** le mode ouvrés/week-end, **When** les groupes sont configurés,
   **Then** les sept jours appartiennent exactement à un groupe.
2. **Given** plusieurs périodes, **When** elles sont validées, **Then** elles
   couvrent toute l’année sans trou ni chevauchement, y compris au passage du
   31 décembre.
3. **Given** deux périodes et deux types de jour, **When** la composition est
   créée, **Then** quatre combinaisons explicites reçoivent chacune un profil.
4. **Given** un changement d’organisation, **When** des profils existent déjà,
   **Then** un aperçu de migration propose conserver, copier ou réaffecter ;
   aucune donnée n’est effacée automatiquement.
5. **Given** une combinaison incomplète, **When** le calcul annuel est demandé,
   **Then** il reste bloqué et indique la combinaison manquante.

### User Story 4 — Obtenir un YEn annuel traçable (Priority: P1)

Un ingénieur obtient le facteur annuel à partir des facteurs locaux de chaque
combinaison, pondérés par leur énergie annuelle réelle.

**Acceptance Scenarios**:

1. **Given** des périodes et types de jour complets, **When** le moteur calcule,
   **Then** il dénombre `N[p,τ]`, calcule `Eload,T,p,τ`, `Eload,f,p,τ`,
   `γ[p,τ]`, `W[p,τ]` et le `γ` annuel.
2. **Given** une seule période et un seul type de jour, **When** le calcul est
   exécuté, **Then** le facteur annuel est égal au facteur local.
3. **Given** deux combinaisons de facteurs différents, **When** leurs énergies
   diffèrent, **Then** la combinaison la plus énergétique pèse davantage que
   celle comptant seulement plus de jours.
4. **Given** une météo de 8 760 heures et un fuseau valide, **When** la série de
   charge est résolue, **Then** chaque heure météo possède exactement une charge.
5. **Given** une entrée modifiée, **When** un ancien résultat est affiché,
   **Then** il est marqué obsolète jusqu’au nouveau calcul.

### User Story 5 — Explorer l’année et une journée (Priority: P2)

L’utilisateur comprend l’effet des périodes et de la météo sans afficher une
masse illisible de 8 760 points.

**Acceptance Scenarios**:

1. **Given** un calcul annuel prêt, **When** la vue annuelle s’ouvre, **Then**
   elle présente les séries agrégées par jour, les périodes et le YEn annuel.
2. **Given** une date sélectionnée, **When** la vue journalière s’ouvre, **Then**
   elle présente 24 charges, 24 POA et le profil résolu pour cette date.
3. **Given** un profil unique, **When** deux dates sont comparées, **Then** la
   charge peut rester identique tandis que la météo et le facteur local changent.
4. **Given** une série indisponible ou obsolète, **When** le graphe s’affiche,
   **Then** aucun tracé de substitution n’est inventé.

### User Story 6 — Télécharger et retrouver une météo en production (Priority: P1)

Un utilisateur localise un site, télécharge une météo, l’enregistre et reste
dans son projet. Après relance, la localité et la série sont encore disponibles.

**Acceptance Scenarios**:

1. **Given** le déploiement web de production, **When** une ville est recherchée,
   **Then** la requête n’est pas envoyée à une route Vite inexistante.
2. **Given** le fournisseur principal indisponible, **When** une donnée locale ou
   une stratégie de secours peut répondre, **Then** elle est utilisée avec sa
   provenance ; sinon les coordonnées manuelles restent disponibles.
3. **Given** une prévisualisation météo, **When** l’utilisateur ne confirme pas,
   **Then** ni la bibliothèque ni le projet ne sont modifiés.
4. **Given** une confirmation, **When** l’écriture réussit, **Then** localité,
   série météo et projet sont enregistrés atomiquement et la même page reste ouverte.
5. **Given** une relance hors ligne, **When** le projet est rouvert, **Then** la
   météo enregistrée et ses preuves sont encore utilisables.

### User Story 7 — Afficher pays et villes dans la langue active (Priority: P2)

Un utilisateur parcourt tous les pays dans la langue active et retrouve une
ville téléchargée en français ou en anglais après changement de langue.

**Acceptance Scenarios**:

1. **Given** la langue française ou anglaise, **When** la liste des pays est
   ouverte, **Then** le référentiel ISO embarqué complet est trié dans cette langue.
2. **Given** un pays sélectionné, **When** la langue change, **Then** le même code
   ISO reste sélectionné et seul son libellé change.
3. **Given** une localité ayant des noms français et anglais en cache, **When** la
   langue change hors ligne, **Then** le libellé change sans nouvel appel réseau.
4. **Given** une traduction absente, **When** la localité est affichée, **Then**
   le nom original est utilisé explicitement, sans traduction inventée.

## Functional Requirements

### Nettoyage et interface

- **FR-001**: Le champ « Photo du site » MUST disparaître de l’interface et de la
  prochaine version canonique ; la lecture d’un ancien `projectImageRef` MUST
  rester migrable sans erreur.
- **FR-002**: La méthode facture MUST rester disponible et fonctionnelle.
- **FR-003**: Seul l’encadré explicatif rouge de la méthode facture MUST être retiré.
- **FR-004**: Les alertes MUST utiliser une bordure uniforme ; aucun état d’alerte
  ne MUST utiliser un filet gauche coloré.
- **FR-005**: Les indicateurs de focus, sélection et navigation MUST rester visibles.

### Échange des équipements

- **FR-006**: L’import/export MUST utiliser un classeur `.xlsx` et une feuille
  unique `Equipements` pour les lignes classiques et inductives.
- **FR-007**: Les colonnes MUST être `designation`, `quantite`,
  `puissance_unitaire_W`, `rendement`, `coefficient_demarrage`, `heures_usage`
  et `h00` à `h23`.
- **FR-008**: `simultaneite_pct` et les colonnes calculées MUST être absentes du
  contrat d’échange.
- **FR-009**: Un coefficient vide MUST classifier la ligne comme classique ; un
  coefficient fini `>= 1` MUST la classifier comme inductive.
- **FR-010**: Les contraintes de colonnes MUST être centralisées dans un parseur
  sans dépendance à React.
- **FR-011**: Les 24 colonnes horaires MUST être toutes vides ou toutes valides
  dans `[0,1]`; un remplissage partiel MUST bloquer l’import.
- **FR-012**: Lorsque les 24 colonnes sont vides, `heures_usage` MUST alimenter
  `defaultOperatingFractions(duration, 8)` et produire un avertissement visible.
- **FR-013**: Lorsque les heures sont fournies, leur somme MUST correspondre à
  `heures_usage` selon une tolérance documentée.
- **FR-014**: L’inspection MUST collecter toutes les erreurs et MUST précéder
  toute mutation.

### Profil horaire

- **FR-015**: Le fichier horaire MUST contenir exactement les colonnes `heure`,
  `puissance_moyenne_kW`, `puissance_pointe_kW` et exactement 24 lignes utiles.
- **FR-016**: `heure` MUST être un entier unique de 0 à 23 ; les puissances MUST
  être finies et non négatives ; la pointe MUST être supérieure ou égale à la moyenne.
- **FR-017**: L’import MUST remplacer atomiquement uniquement le profil actif.
- **FR-018**: Les en-têtes français et anglais approuvés MUST converger vers le
  même contrat canonique.

### Calendrier et profils

- **FR-019**: Les seules organisations livrées MUST être `annual`,
  `workweek-weekend` et `periods-by-day-type`.
- **FR-020**: Le mode annuel MUST conserver les sources équipement, horaire et facture.
- **FR-021**: Les modes ouvrés/week-end et périodes × types de jour MUST accepter
  uniquement des profils horaires directs saisis ou importés.
- **FR-022**: Les groupes ouvrés et week-end MUST partitionner exactement les sept jours.
- **FR-023**: Les périodes MUST couvrir l’année exactement une fois et MAY traverser
  le changement d’année.
- **FR-024**: Chaque combinaison générée MUST avoir exactement une affectation de profil.
- **FR-025**: Modifier l’organisation MUST passer par une prévisualisation de
  migration et MUST NOT supprimer silencieusement un profil.
- **FR-026**: Le résolveur calendaire MUST être une fonction pure recevant une
  date locale et retournant une seule combinaison ou une erreur explicite.

### YEn annuel et graphes

- **FR-027**: Le moteur MUST calculer le facteur local `γ[p,τ]` à partir de
  l’énergie favorable `Eload,f,p,τ` et de l’énergie totale `Eload,T,p,τ`.
- **FR-028**: Le facteur annuel MUST respecter l’équation pondérée définie dans
  `contracts/annual-yen.md`.
- **FR-029**: Le poids `W[p,τ]` MUST valoir `N[p,τ] × Eload,T,p,τ` ; un poids basé
  uniquement sur le nombre de jours est interdit.
- **FR-030**: Le résultat MUST exposer facteurs locaux, poids, numérateur,
  dénominateur, version moteur, hash d’entrée et traces de formule/source.
- **FR-031**: Une énergie annuelle totale nulle MUST produire un état indisponible,
  jamais zéro comme facteur calculé.
- **FR-032**: La série annuelle MUST être alignée sur les horodatages météo et le
  fuseau du site ; aucune heure ne peut recevoir zéro ou deux profils.
- **FR-033**: La vue annuelle MUST agréger visuellement les données par jour tout
  en conservant le calcul sur les données horaires complètes.
- **FR-034**: La vue journalière MUST permettre de choisir une date et présenter
  charge, POA, période, type de jour et facteur local.

### Localisation, réseau et pays

- **FR-035**: Les clients métier MUST dépendre de ports de localisation et
  d’acquisition météo, et non de chemins `/external/*` codés en dur.
- **FR-036**: L’adaptateur web de développement MAY utiliser le proxy Vite ;
  l’adaptateur web de production MUST utiliser une passerelle déployée et configurée.
- **FR-037**: L’adaptateur Tauri MUST appeler les fournisseurs via les capacités
  HTTP de la plateforme et MUST NOT exiger le serveur Vite.
- **FR-038**: Une construction destinée à la production MUST échouer ou exposer
  un état `unconfigured` si aucune passerelle web n’est configurée ; elle MUST NOT
  envoyer une requête vers une route statique inexistante.
- **FR-039**: La localisation MUST rechercher d’abord la bibliothèque locale,
  puis le fournisseur principal, puis une stratégie de secours approuvée.
- **FR-040**: Les coordonnées manuelles et l’import d’un JSON PVGIS MUST rester
  disponibles lorsque le géocodage échoue.
- **FR-041**: Un référentiel ISO actuel complet MUST être embarqué avec codes
  alpha-2 et libellés français/anglais ; l’ancienne liste de 241 pays MUST être
  une source de migration uniquement.
- **FR-042**: Le projet MUST conserver le code pays, l’identité de localité et les
  noms localisés, pas un unique nom de pays rendu dans une langue.

### Persistance

- **FR-043**: Prévisualiser une météo MUST être une opération sans écriture.
- **FR-044**: Confirmer une météo MUST persister atomiquement localité, noms,
  source, fichier, provenance et rattachement au projet.
- **FR-045**: Une erreur d’écriture MUST laisser le projet et la bibliothèque dans
  leur état antérieur et garder le dialogue ouvert.
- **FR-046**: Le navigateur MUST utiliser un adaptateur durable compatible avec
  les tests de relance ; Tauri MUST utiliser SQLite derrière les mêmes ports.
- **FR-047**: SQLite MUST conserver un index de projet et un document JSON
  canonique versionné, sans créer un second modèle métier divergent.
- **FR-048**: Excel MUST rester un format d’échange et MUST NOT devenir une
  autorité de persistance.

## Edge Cases

- période traversant décembre et janvier ;
- année météo bissextile ou série autre que 8 760 pas ;
- changement de fuseau après téléchargement ;
- heure locale ambiguë ou absente lors d’un changement d’heure ;
- combinaison dont l’énergie quotidienne est nulle ;
- tous les poids annuels nuls ;
- colonnes Excel traduites, réordonnées, dupliquées ou inconnues ;
- virgule ou point décimal selon l’outil ayant produit le fichier ;
- heures Excel partielles ou somme différente de `heures_usage` ;
- coefficient de démarrage présent mais égal à une valeur non finie ;
- fournisseur lent, réponse HTML, JSON invalide, limite de débit ou abandon ;
- passerelle de production absente sur un hébergement statique ;
- localité connue sous des orthographes différentes ;
- données météo enregistrées mais rattachement au projet impossible ;
- changement de langue sans nom de ville traduit en cache.

## Key Entities

- **LoadCalendarV2**: organisation temporelle, groupes de jours, périodes et affectations.
- **HourlyLoadProfileV2**: 24 puissances moyennes et de pointe, avec provenance de saisie/import.
- **EquipmentLoadRowV2**: équipement consommateur et planning de 24 fractions.
- **AnnualLoadSeriesV1**: charge résolue sur les horodatages de la météo.
- **AnnualYEnResultV1**: facteurs locaux, poids énergétiques et agrégat annuel.
- **ImportInspectionV1**: lignes candidates, erreurs, avertissements et décision atomique.
- **CountryReferenceV1**: code ISO et libellés français/anglais.
- **LocalizedLocalityV1**: identité stable, noms localisés, coordonnées et fuseau.
- **WeatherLibraryRecordV2**: météo horaire, provenance, hash et localité.
- **ExternalDataGatewayConfigV1**: configuration explicite de la passerelle web.

## Success Criteria

- **SC-001**: 100 % des imports invalides laissent le projet byte-for-byte inchangé.
- **SC-002**: un aller-retour Excel conserve toutes les lignes et les 24 fractions horaires.
- **SC-003**: toutes les dates d’une année de référence résolvent exactement une combinaison.
- **SC-004**: le résultat annuel respecte l’équation de référence à `1e-12` près
  sur les jeux unitaires et les golden datasets approuvés.
- **SC-005**: le cas une période × un type est strictement égal au facteur local.
- **SC-006**: un téléchargement confirmé est présent après reconstruction des providers.
- **SC-007**: la recherche fonctionne en développement, dans le déploiement web
  configuré et dans l’adaptateur Tauri de test sans dépendre du proxy Vite.
- **SC-008**: tous les codes pays du snapshot ISO possèdent un libellé français
  et anglais ou une règle de repli testée.
- **SC-009**: les vues annuelle et journalière n’affichent aucun résultat si la
  météo, le calendrier ou les profils sont incomplets ou obsolètes.
- **SC-010**: les parcours critiques passent au clavier en français et en anglais,
  sans filet gauche coloré sur les alertes.

## Assumptions

- `γ`, `YEn` et « facteur de qualité de la demande » désignent la même grandeur
  dans cette tranche ; l’interface conserve le terme produit `YEn`.
- `Eload,f,p,τ` est la moyenne des énergies quotidiennes favorables calculées
  sur les dates réelles de la combinaison selon le seuil POA ;
  `Eload,T,p,τ` est l’énergie quotidienne totale du profil correspondant.
- Les profils horaires combinés décrivent une journée type et restent constants
  à l’intérieur de leur combinaison.
- Le fichier météo constitue le calendrier de référence du calcul annuel ; son
  nombre d’horodatages est autoritaire après validation.
- Le déploiement web qui souhaite les fonctions réseau fournit une passerelle
  configurée ; un ensemble de fichiers statiques seul ne peut pas embarquer le
  proxy du serveur Vite.

## Gates requiring explicit approval

- approbation de l’équation annuelle et des identifiants de source/formule ;
- création de `ProjectInputsV2` et migration de `ProjectInputsV1` ;
- choix et conditions d’utilisation du fournisseur de géocodage de secours ;
- choix de l’URL et du mode de déploiement de la passerelle web de production ;
- choix final du plugin SQLite/HTTP lors de la tranche Tauri ;
- golden datasets scientifiques du facteur annuel.
