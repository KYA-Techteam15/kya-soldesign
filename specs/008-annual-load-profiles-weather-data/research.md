# Research — Profils annuels, échanges de charges et données météo durables

## R-001 — Interprétation de l’équation annuelle

**Decision**: calculer un facteur local pour chaque couple période `p` / type de
jour `τ`, puis agréger ces facteurs avec le poids énergétique
`W[p,τ] = N[p,τ] × Eload,T,p,τ`.

**Rationale**: la formule fournie par le demandeur précise qu’une période à forte
consommation doit dominer l’agrégat même si elle comporte moins de jours.
Calculer un simple facteur sur une journée moyenne ou une moyenne arithmétique
des facteurs ne respecte pas cette propriété.

**Normative source**: `SRC-USER-ANNUAL-YEN-EQ9`, capture fournie le 2026-08-27.

## R-002 — Différence avec le calcul courant

Le calcul courant `CALC-P1-011` compare un profil quotidien de 24 valeurs à une
POA moyenne par heure sur l’année. Il convient au cas local historique mais ne
représente ni les périodes ni leur poids énergétique annuel.

**Decision**: conserver la définition locale comme brique de base, ajouter un
registre distinct pour le dénombrement/pondération annuelle et ne pas modifier
silencieusement la signification d’une ancienne preuve.

## R-003 — Besoin simple et trois organisations composées

**Decision**: séparer `simple` de `composed`. Le besoin simple conserve ses trois
sources. La branche composée livre `workweek-weekend`, `periods` et
`periods-by-day-type`. Les variantes 7 jours et `N` sont différées.

**Rationale**: saisons seules et saisons croisées ne doivent pas être confondues.
Une autorité active discriminée évite qu’une facture ou un inventaire dormant
influence silencieusement un calcul composé.

## R-004 — Profils combinés directement horaires

**Decision**: toutes les combinaisons ouvrés/week-end, périodes seules et
périodes × types de jour sont définies uniquement par 24 puissances moyennes et
24 pointes facultatives, saisies ou importées. Une pointe vide vaut la moyenne.

**Rationale**: l’utilisateur compose un calendrier puis fournit la courbe utile,
sans dupliquer un inventaire d’équipements pour chaque combinaison. Le besoin
simple garde les trois méthodes existantes, dont la facture, dans une branche
conservée mais inactive lorsque la composition pilote le calcul.

## R-005 — Un seul classeur d’équipements

**Decision**: utiliser une feuille unique. `coefficient_demarrage` vide signifie
classique ; une valeur `>= 1` signifie inductif.

**Rejected**: deux fichiers classique/inductif, car ils compliquent le round-trip,
les imports mixtes et le support utilisateur.

## R-006 — Heures optionnelles et défaut déterministe

**Decision**: `h00..h23` sont soit toutes vides, soit toutes présentes et valides.
Si elles sont vides, utiliser `defaultOperatingFractions(heures_usage, 8)`.

**Rationale**: cet algorithme existe déjà dans le moteur, gère les fractions et
reste testable. Une heure partielle ne doit pas être complétée arbitrairement.

## R-007 — Pourquoi le proxy courant échoue en production

Vite intercepte actuellement `/external/open-meteo/*`,
`/external/bigdatacloud/*` et `/external/pvgis/*` pendant `pnpm dev` ou
`vite preview`, puis transmet les requêtes aux fournisseurs. Le code placé dans
`dist` ne contient pas ce serveur : un hébergement statique reçoit la route
`/external/...` comme une demande de fichier local et répond 404, renvoie parfois
`index.html`, ou laisse la requête échouer. Tauri n’exécute pas non plus le
serveur Vite en production.

**Decision**:

- développement : conserver la passerelle Vite ;
- web de production : fournir une URL de passerelle déployée et injectée ;
- Tauri : utiliser un adaptateur HTTP natif vers les fournisseurs autorisés ;
- domaine/application : ne connaître que les ports, jamais les URLs relatives.

**Important**: un `dist` purement statique ne peut pas embarquer un proxy serveur.
Faire fonctionner le réseau exige soit une passerelle réellement déployée, soit
des appels directs explicitement autorisés par CORS et par les fournisseurs ;
la conception ne suppose pas cette autorisation.

## R-008 — Résilience sans dépendance unique

**Decision**: ordre de résolution : bibliothèque locale, fournisseur principal,
fournisseur de secours approuvé, coordonnées manuelles/import PVGIS.

Chaque réponse conserve provider, locator, date, langue, coordonnées et hash.
Un secours ne devient jamais une donnée prétendument issue du fournisseur principal.

## R-009 — Pays et villes bilingues

`ksd_app` contient 241 entrées bilingues mais aussi des codes historiques. Le
code Next ne possède qu’une liste initiale de 17 codes enrichie par le petit
catalogue local.

**Decision**: embarquer un snapshot ISO actuel et stocker le code alpha-2 comme
identité. Les villes conservent `nameOriginal`, `names.fr` et `names.en` ; un nom
manquant retombe sur l’original.

## R-010 — Persistance hybride

**Decision**: le JSON canonique reste le format public et la charge utile du
projet ; SQLite indexe les projets, conserve leurs révisions et stocke la
bibliothèque locale sous Tauri. Excel reste un format d’échange.

**Rationale**: normaliser tout le projet en tables créerait un second modèle à
faire migrer. JSON seul ne fournit pas les transactions, index et révisions
nécessaires à un logiciel commercial.

## R-011 — Écriture météo unique

Le flux actuel écrit la prévisualisation dans IndexedDB via `onStore`, puis écrit
de nouveau lors de la confirmation et rattache séparément le résultat au projet.

**Decision**: la prévisualisation est pure ; une commande de confirmation écrit
la bibliothèque et le projet dans une transaction logique unique. Sous SQLite,
elle devient une transaction physique unique.

## R-012 — Série horaire autoritaire et fréquences de présentation

**Decision**: le moteur conserve les pas horaires. La vue choisit indépendamment
une plage (`year`, `period`, `month`, `week`, `day`, `custom-range`) et une
fréquence (`auto`, `hourly`, `daily`, `weekly`, `monthly`).

**Rationale**: 8 760 barres nuisent à la lecture, mais l’utilisateur doit pouvoir
inspecter l’année horaire. La vue annuelle par défaut agrège par jour ; le mode
horaire utilise une courbe zoomable et une réduction visuelle préservant les
extrema. L’agrégation visuelle ne devient jamais l’entrée du calcul.

## R-013 — Dialogue unique et transactionnel

**Decision**: toute la composition réside dans un dialogue unique comprenant
organisation, calendrier, matrice, profils 0 h–23 h et vérification. Le dialogue
édite un brouillon isolé et ne publie qu’après validation complète.

**Rationale**: répartir organisation et valeurs entre dialogue et page rend la
relation combinaison → profil difficile à comprendre. Une page durablement
grisée suggère un blocage. La page principale montre donc une synthèse et les
résultats ; le dialogue contient la complexité occasionnelle.

## R-014 — Conservation des données simples

**Decision**: basculer vers une composition ne supprime ni ne convertit
automatiquement les équipements, le profil horaire simple ou la facture. Ces
données restent dans la branche simple inactive et sont restaurées à son retour.

**Rationale**: les deux méthodes répondent à des niveaux de connaissance
différents. La conservation évite une perte de travail tout en garantissant une
seule autorité active pour le calcul.

## R-015 — Règles d’agrégation graphique

**Decision**: énergie = somme ; puissance moyenne = moyenne pondérée par durée ;
puissance de pointe = maximum. L’export du graphe applique les mêmes règles et
indique plage, fréquence et unités.

**Rationale**: utiliser une moyenne générique donnerait des résultats faux et
confondrait puissance et énergie. Les agrégations appartiennent à un service pur
testable, jamais au composant React.
