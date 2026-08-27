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

## R-003 — Trois organisations temporelles seulement

**Decision**: livrer `annual`, `workweek-weekend` et
`periods-by-day-type`. Les variantes 7 jours, 12 mois et `N` sont différées.

**Rationale**: ces trois parcours couvrent le profil simple et la combinaison
métier demandée avec une interface explicite. Les autres granularités de
`ksd_app` multiplient les choix et les risques de couverture incomplète.

## R-004 — Profils combinés directement horaires

**Decision**: les combinaisons ouvrés/week-end et périodes × types de jour sont
définies uniquement par 24 puissances moyenne/pointe, saisies ou importées.

**Rationale**: l’utilisateur compose un calendrier puis fournit la courbe utile,
sans dupliquer un inventaire d’équipements pour chaque combinaison. Le profil
annuel garde les trois méthodes existantes, dont la facture.

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

## R-012 — Présentation des 8 760 points

**Decision**: le moteur conserve les pas horaires ; la vue annuelle affiche une
agrégation quotidienne et permet d’ouvrir une date en 24 points.

**Rationale**: 8 760 points bruts dans un graphe initial nuisent à la lecture,
mais leur agrégation visuelle ne doit jamais devenir l’entrée du calcul.

