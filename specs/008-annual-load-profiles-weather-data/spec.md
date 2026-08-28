# Feature Specification: Profils annuels, échanges de charges et données météo durables

**Feature Branch**: `008-annual-load-profiles-weather-data`  
**Roadmap ID**: `PAGE1-002`  
**Created**: 2026-08-27  
**Revised**: 2026-08-28
**Status**: Draft révisé — soumis à validation avant réimplémentation UI
**Input**: simplifier les profils saisonniers, importer et exporter les charges,
calculer le YEn annuel selon l’équation fournie, rendre la localisation et la
météo fiables en production, puis préparer leur persistance Tauri hors ligne.

## Objectif

Faire évoluer la Page 1 d’un besoin annuel simple vers une définition annuelle
auditable et éventuellement composée. Le besoin simple conserve les méthodes
équipements, saisie horaire et facture. Dès qu’une organisation temporelle est
activée, les équipements et la facture sont exclus du calcul : l’utilisateur
définit uniquement des journées types de 0 h à 23 h, répétées automatiquement
sur les dates correspondantes. Chaque combinaison possède un profil journalier
direct et contribue au facteur annuel par pondération énergétique.

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
- distinguer le besoin annuel simple des profils temporels composés ;
- livrer trois organisations composées : ouvrés/week-end, périodes seules et
  périodes × types de jour ;
- définir chaque combinaison uniquement par les puissances de 0 h à 23 h,
  saisies ou importées, sans équipement ni facture ;
- regrouper toute la configuration composée dans un dialogue unique et
  transactionnel ;
- conserver les données du besoin simple lorsqu’elles deviennent inactives ;
- calculer un YEn annuel comme moyenne énergétique des facteurs locaux ;
- proposer une vue annuelle avec plage et fréquence d’affichage sélectionnables,
  ainsi qu’une vue détaillée par jour ;
- conserver le calcul sur la série horaire complète quelle que soit la fréquence
  choisie pour le graphe ;
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
- dialogue unique pour organisation, calendrier, matrice, saisie, import, copie,
  affectation, vérification et application des profils composés ;
- brouillon isolé et commit atomique à la confirmation du dialogue ;
- conservation inactive du besoin simple pendant l’utilisation des profils composés ;
- résolution d’un profil pour chaque date locale de l’année météo ;
- calcul des facteurs locaux et du facteur annuel pondéré par énergie ;
- série annuelle de charge de 8 760 pas, avec politique explicite pour 8 784 pas ;
- visualisation annuelle avec périodes année/saison/mois/semaine/jour/plage libre ;
- fréquences visuelles automatique, horaire, journalière, hebdomadaire et mensuelle ;
- agrégations métier explicites et détail horaire d’une date ;
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
- profil par chacun des sept jours ou granularité libre `N` ;
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

Un utilisateur ouvre un seul dialogue, choisit ouvrés/week-end, périodes seules
ou périodes × types de jour, puis définit directement les puissances de 0 h à
23 h nécessaires pour chaque combinaison. Les équipements et la facture ne
participent jamais à ces profils composés.

**Acceptance Scenarios**:

1. **Given** le mode ouvrés/week-end, **When** les groupes sont configurés,
   **Then** deux journées types sont requises et les sept jours appartiennent
   exactement à un groupe.
2. **Given** plusieurs périodes, **When** elles sont validées, **Then** elles
   couvrent toute l’année sans trou ni chevauchement, y compris au passage du
   31 décembre.
3. **Given** le mode périodes seules, **When** deux saisons sont créées, **Then**
   chaque saison reçoit une journée type répétée sur toutes ses dates.
4. **Given** deux périodes et deux types de jour, **When** la composition est
   créée, **Then** quatre combinaisons explicites reçoivent chacune un profil.
5. **Given** un changement d’organisation, **When** des profils existent déjà,
   **Then** un aperçu de migration propose conserver, copier ou réaffecter ;
   aucune donnée n’est effacée automatiquement.
6. **Given** une combinaison incomplète, **When** l’utilisateur vérifie le
   dialogue, **Then** l’application est bloquée et la combinaison est nommée.
7. **Given** des modifications dans le dialogue, **When** l’utilisateur annule,
   **Then** le projet reste byte-for-byte inchangé.
8. **Given** une composition valide, **When** l’utilisateur applique,
   **Then** le remplacement est atomique et le graphe annuel devient obsolète
   jusqu’au recalcul.
9. **Given** le mode composé actif, **When** la page principale est affichée,
   **Then** équipements et facture sont remplacés par une synthèse compacte et
   ne peuvent pas influencer le calcul.
10. **Given** un retour au besoin simple, **When** l’utilisateur confirme,
   **Then** ses anciennes données équipements/horaire/facture sont restaurées.
11. **Given** une combinaison incomplète, **When** le calcul annuel est demandé,
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

### User Story 5 — Explorer l’année à différentes fréquences (Priority: P2)

L’utilisateur comprend l’effet des périodes et de la météo sur l’année entière,
puis choisit la plage et la fréquence adaptées sans modifier les données du calcul.

**Acceptance Scenarios**:

1. **Given** un calcul annuel prêt, **When** la vue s’ouvre, **Then** elle affiche
   l’année entière avec une fréquence automatique journalière, les limites de
   périodes et le YEn annuel.
2. **Given** une plage année, période, mois, semaine, jour ou personnalisée,
   **When** elle est sélectionnée, **Then** le graphe et son export utilisent
   exactement cette plage.
3. **Given** une fréquence horaire, journalière, hebdomadaire ou mensuelle,
   **When** elle est sélectionnée, **Then** seules les données de présentation
   sont agrégées ; le calcul scientifique reste horaire.
4. **Given** l’année complète en fréquence horaire, **When** le graphe est rendu,
   **Then** il préserve les extrema et permet zoom/navigation sans dessiner une
   barre illisible par point.
5. **Given** une date sélectionnée, **When** la vue journalière s’ouvre, **Then**
   elle présente 24 charges, 24 POA et le profil résolu pour cette date.
6. **Given** un profil unique, **When** deux dates sont comparées, **Then** la
   charge peut rester identique tandis que la météo et le facteur local changent.
7. **Given** une série indisponible ou obsolète, **When** le graphe s’affiche,
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
  être finies et non négatives ; une pointe renseignée MUST être supérieure ou
  égale à la moyenne. Une pointe vide MUST être normalisée vers la moyenne avec
  un avertissement traçable.
- **FR-017**: L’import MUST remplacer atomiquement uniquement le profil actif.
- **FR-018**: Les en-têtes français et anglais approuvés MUST converger vers le
  même contrat canonique.

### Calendrier et profils

- **FR-019**: Le besoin MUST avoir une autorité active discriminée : `simple`
  ou `composed`. Une seule branche MUST alimenter le calcul à la fois.
- **FR-020**: Le besoin simple MUST conserver les sources équipement, horaire et facture.
- **FR-021**: Les organisations composées livrées MUST être
  `workweek-weekend`, `periods` et `periods-by-day-type`.
- **FR-022**: Toutes les combinaisons composées MUST accepter uniquement des
  profils journaliers directs de 24 heures, saisis ou importés. Les équipements,
  factures, durées d’usage et coefficients ne MUST pas y être accessibles.
- **FR-023**: Activer les profils composés MUST conserver la branche simple sans
  la modifier ; revenir au besoin simple MUST restaurer ses données.
- **FR-024**: Les groupes ouvrés et week-end MUST partitionner exactement les sept jours.
- **FR-025**: Les périodes MUST couvrir l’année exactement une fois et MAY traverser
  le changement d’année.
- **FR-026**: Chaque combinaison générée MUST avoir exactement une affectation de profil.
- **FR-027**: Modifier l’organisation MUST passer par une prévisualisation de
  migration et MUST NOT supprimer silencieusement un profil.
- **FR-028**: Le résolveur calendaire MUST être une fonction pure recevant une
  date locale et retournant une seule combinaison ou une erreur explicite.
- **FR-029**: Toute la configuration composée MUST résider dans un dialogue
  unique : organisation, jours, périodes, matrice, profils 0 h–23 h, import,
  copie, vérification et application.
- **FR-030**: Le dialogue MUST éditer un brouillon isolé. Fermer ou annuler MUST
  laisser le projet inchangé ; appliquer MUST effectuer un commit atomique après
  validation globale.
- **FR-031**: Le dialogue MUST permettre de sélectionner une combinaison, saisir
  ses 24 puissances moyennes, saisir facultativement ses 24 pointes, importer,
  exporter, copier ou réutiliser un profil.
- **FR-032**: La page principale en mode composé MUST masquer les formulaires
  équipements/facture et présenter seulement une synthèse, une action de
  configuration et les résultats annuels.

### YEn annuel et graphes

- **FR-033**: Le moteur MUST calculer le facteur local `γ[p,τ]` à partir de
  l’énergie favorable `Eload,f,p,τ` et de l’énergie totale `Eload,T,p,τ`.
- **FR-034**: Le facteur annuel MUST respecter l’équation pondérée définie dans
  `contracts/annual-yen.md`.
- **FR-035**: Le poids `W[p,τ]` MUST valoir `N[p,τ] × Eload,T,p,τ` ; un poids basé
  uniquement sur le nombre de jours est interdit.
- **FR-036**: Le résultat MUST exposer facteurs locaux, poids, numérateur,
  dénominateur, version moteur, hash d’entrée et traces de formule/source.
- **FR-037**: Une énergie annuelle totale nulle MUST produire un état indisponible,
  jamais zéro comme facteur calculé.
- **FR-038**: La série annuelle MUST être alignée sur les horodatages météo et le
  fuseau du site ; aucune heure ne peut recevoir zéro ou deux profils.
- **FR-039**: Le moteur MUST conserver une série horaire autoritaire. La plage et
  la fréquence du graphe MUST être des paramètres de présentation sans effet
  sur les entrées, résultats ou traces scientifiques.
- **FR-040**: La vue MUST proposer les plages `year`, `period`, `month`, `week`,
  `day` et `custom-range`.
- **FR-041**: La vue MUST proposer les fréquences `auto`, `hourly`, `daily`,
  `weekly` et `monthly`. `auto` MUST choisir une fréquence lisible selon la plage.
- **FR-042**: Les agrégations MUST appliquer : énergie = somme ; puissance
  moyenne = moyenne pondérée par durée ; pointe = maximum ; aucune moyenne
  silencieuse de grandeurs incompatibles n’est autorisée.
- **FR-043**: L’année en fréquence horaire MUST rester consultable par courbe,
  zoom et réduction visuelle préservant les extrema ; le graphe initial MUST NOT
  dessiner 8 760 barres ou transformer la série source.
- **FR-044**: La vue journalière MUST permettre de choisir une date et présenter
  charge, POA, période, type de jour et facteur local.
- **FR-045**: L’export depuis le graphe MUST utiliser la plage, la fréquence, les
  unités et les règles d’agrégation actuellement sélectionnées.

### Localisation, réseau et pays

- **FR-046**: Les clients métier MUST dépendre de ports de localisation et
  d’acquisition météo, et non de chemins `/external/*` codés en dur.
- **FR-047**: L’adaptateur web de développement MAY utiliser le proxy Vite ;
  l’adaptateur web de production MUST utiliser une passerelle déployée et configurée.
- **FR-048**: L’adaptateur Tauri MUST appeler les fournisseurs via les capacités
  HTTP de la plateforme et MUST NOT exiger le serveur Vite.
- **FR-049**: Une construction destinée à la production MUST échouer ou exposer
  un état `unconfigured` si aucune passerelle web n’est configurée ; elle MUST NOT
  envoyer une requête vers une route statique inexistante.
- **FR-050**: La localisation MUST rechercher d’abord la bibliothèque locale,
  puis le fournisseur principal, puis une stratégie de secours approuvée.
- **FR-051**: Les coordonnées manuelles et l’import d’un JSON PVGIS MUST rester
  disponibles lorsque le géocodage échoue.
- **FR-052**: Un référentiel ISO actuel complet MUST être embarqué avec codes
  alpha-2 et libellés français/anglais ; l’ancienne liste de 241 pays MUST être
  une source de migration uniquement.
- **FR-053**: Le projet MUST conserver le code pays, l’identité de localité et les
  noms localisés, pas un unique nom de pays rendu dans une langue.

### Persistance

- **FR-054**: Prévisualiser une météo MUST être une opération sans écriture.
- **FR-055**: Confirmer une météo MUST persister atomiquement localité, noms,
  source, fichier, provenance et rattachement au projet.
- **FR-056**: Une erreur d’écriture MUST laisser le projet et la bibliothèque dans
  leur état antérieur et garder le dialogue ouvert.
- **FR-057**: Le navigateur MUST utiliser un adaptateur durable compatible avec
  les tests de relance ; Tauri MUST utiliser SQLite derrière les mêmes ports.
- **FR-058**: SQLite MUST conserver un index de projet et un document JSON
  canonique versionné, sans créer un second modèle métier divergent.
- **FR-059**: Excel MUST rester un format d’échange et MUST NOT devenir une
  autorité de persistance.

## Edge Cases

- annulation du dialogue après modification de plusieurs profils ;
- changement d’organisation avec profils simples et composés déjà présents ;
- période seule, ouvrés/week-end seul et périodes × jours ;
- profil composé incomplet ou pointe horaire vide/inférieure à la moyenne ;
- copie d’un profil puis modification qui ne doit pas altérer l’original ;
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
- plage graphique personnalisée inversée ou hors série ;
- fréquence mensuelle sur une plage de quelques heures ;
- année complète en fréquence horaire et conservation des pointes rares ;
- export d’une vue agrégée puis comparaison avec la série horaire autoritaire.

## Key Entities

- **LoadDefinitionV2**: autorité active simple/composée et conservation des deux branches.
- **ComposedLoadDraftV1**: brouillon transactionnel du dialogue avant validation.
- **LoadCalendarV2**: organisation composée, groupes de jours, périodes et affectations.
- **DirectDailyLoadProfileV2**: 24 puissances moyennes et pointes facultatives,
  avec provenance de saisie/import.
- **EquipmentLoadRowV2**: équipement consommateur et planning de 24 fractions.
- **AnnualLoadSeriesV1**: charge résolue sur les horodatages de la météo.
- **AnnualYEnResultV1**: facteurs locaux, poids énergétiques et agrégat annuel.
- **ImportInspectionV1**: lignes candidates, erreurs, avertissements et décision atomique.
- **CountryReferenceV1**: code ISO et libellés français/anglais.
- **LocalizedLocalityV1**: identité stable, noms localisés, coordonnées et fuseau.
- **WeatherLibraryRecordV2**: météo horaire, provenance, hash et localité.
- **ExternalDataGatewayConfigV1**: configuration explicite de la passerelle web.
- **AnnualChartQueryV1**: plage, fréquence, séries et options d’affichage.
- **AnnualChartSeriesV1**: points de présentation dérivés de la série horaire.

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
- **SC-011**: annuler le dialogue après toute séquence d’édition laisse le projet
  byte-for-byte inchangé ; appliquer une composition valide produit un seul commit.
- **SC-012**: aucun profil composé ne contient ou ne lit une entrée équipement ou facture.
- **SC-013**: ouvrés/week-end génère exactement deux journées types ; deux périodes
  seules génèrent deux profils ; deux périodes × deux types génèrent quatre combinaisons.
- **SC-014**: changer plage ou fréquence du graphe ne modifie ni hash d’entrée,
  ni résultat YEn, ni série annuelle horaire.
- **SC-015**: à toute fréquence, l’énergie agrégée égale la somme horaire à
  `1e-12` près et chaque pointe agrégée égale le maximum de son intervalle.
- **SC-016**: l’année horaire reste navigable à 1024×700 sans blocage supérieur
  à 100 ms sur le jeu de référence et sans perte d’extremum visible.

## Assumptions

- `γ`, `YEn` et « facteur de qualité de la demande » désignent la même grandeur
  dans cette tranche ; l’interface conserve le terme produit `YEn`.
- `Eload,f,p,τ` est la moyenne des énergies quotidiennes favorables calculées
  sur les dates réelles de la combinaison selon le seuil POA ;
  `Eload,T,p,τ` est l’énergie quotidienne totale du profil correspondant.
- Les profils horaires combinés décrivent une journée type et restent constants
  à l’intérieur de leur combinaison.
- La branche simple et la branche composée peuvent coexister dans le document,
  mais une seule est active et calculée.
- La puissance moyenne horaire est obligatoire ; une pointe absente prend la
  valeur moyenne avec un avertissement, sans inventer de surintensité.
- `frequency` désigne uniquement la fréquence de présentation du graphe ; elle
  ne constitue jamais une granularité de calcul ou de persistance scientifique.
- Le fichier météo constitue le calendrier de référence du calcul annuel ; son
  nombre d’horodatages est autoritaire après validation.
- Le déploiement web qui souhaite les fonctions réseau fournit une passerelle
  configurée ; un ensemble de fichiers statiques seul ne peut pas embarquer le
  proxy du serveur Vite.

## Gates requiring explicit approval

- approbation de l’équation annuelle et des identifiants de source/formule ;
- création de `ProjectInputsV2` et migration de `ProjectInputsV1` ;
- validation du dialogue unique et de la séparation simple/composé ;
- validation des plages/fréquences et règles d’agrégation du graphe ;
- choix et conditions d’utilisation du fournisseur de géocodage de secours ;
- choix de l’URL et du mode de déploiement de la passerelle web de production ;
- choix final du plugin SQLite/HTTP lors de la tranche Tauri ;
- golden datasets scientifiques du facteur annuel.
