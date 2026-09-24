# Feature Specification: Refonte UX — besoins, profil horaire, optimisation, accueil et émission du dossier

**Feature Branch**: `feat/011-ux-refonte`
**Roadmap ID**: `UX-001`
**Created**: 2026-09-24
**Status**: Approuvée par le demandeur — liste M-00 à M-38 validée dans la conversation du 2026-09-24
**Input**: parcours de l'application 1.0.0 avec le demandeur ; maquettes ASCII discutées et amendées
(noms d'étape conservés, pas de libellés « Nuit / Journée / Soirée », bouton Optimiser conservé).

## Objectif

Rendre l'outil **plus direct à utiliser sans rien perdre de sa rigueur** :

1. l'utilisateur part de **ce dont il dispose** (appareils, journée type, année par saison, relevé
   annuel, factures) et peut changer de source à tout moment sans perdre ses données ;
2. le recensement tient dans **un seul tableau** d'appareils ; la simultanéité disparaît ;
3. les horaires se consultent au survol et se règlent d'un clic, un appareil ou tous à la fois ;
4. l'optimisation travaille sur **les références de l'utilisateur** et donne des chiffres simulés ;
5. l'accueil sert l'utilisateur qui revient ; un dossier remis au client est **émis** et figé ;
6. **toute information affichée aide l'utilisateur, sinon elle est supprimée**.

## Principes validés

- **P-1 Utile ou supprimé** : versions de méthode, compteurs internes, jargon de calcul quittent
  l'écran ; ils restent dans le fichier projet, la trace de calcul et le rapport de diagnostic.
- **P-2 Données par source** : chaque source de consommation garde ses données ; seule la source
  active alimente les calculs ; changer de source ne supprime rien.
- **P-3 Heures neutres** : les heures s'écrivent 00–23 ; aucun libellé de moment de la journée
  (dépend du pays) ; les modèles d'horaire portent leurs plages (« 08–16 »).
- **P-4 Rien n'est retenu seul** : une proposition d'optimisation ne remplit les composants que sur
  « Retenir » ; les calibres suggérés restent le choix par défaut (spec 010).
- Les noms d'étape actuels sont conservés.

## Exigences fonctionnelles

### Navigation et cohérence (M-01 → M-04)

- **FR-001** Le bouton de l'étape 8 s'intitule « Préparer les documents client → » (EN « Prepare
  client documents → ») et ouvre l'onglet d'impression.
- **FR-002** Le panneau de droite est replié tant qu'aucun prédimensionnement n'existe ; il s'ouvre
  au premier prédimensionnement ; un repli ou une ouverture manuelle est mémorisé.
- **FR-003** Application de P-1 sur tous les écrans de l'atelier : suppression de « Méthode
  presizing-x », des compteurs « N combinaisons évaluées en amont », des libellés internes
  (γ, YEn pondéré…) remplacés par des libellés métier ou déplacés dans le détail de calcul.

### Accueil (M-05 → M-08)

- **FR-004** Premier lancement (aucun projet) : trois cartes — Votre société (identité des
  documents), Projet exemple, Nouveau projet — et « Importer un .ksd ».
- **FR-005** Ensuite, tableau de bord : carte « Reprendre » (dernier projet, avancement x/8,
  prochaine action, alerte de péremption), tableau des projets (état, étape, date), filtres
  Tous / En cours / Prêts / Émis / Périmés, recherche.
- **FR-006** Les architectures tiennent sur une ligne ; les appels « Créer un projet » en double et
  la section « Types de système » disparaissent.
- **FR-007** Un projet exemple embarqué s'ouvre comme une copie modifiable.

### Cycle de vie du dossier (M-09 → M-12)

- **FR-008** États : Brouillon → En cours → Prêt à émettre → Émis vN → Révision vN+1.
- **FR-009** « Émettre le dossier vN » (étape 8) n'est actif que sans blocage ; il fige une version
  datée et numérotée : entrées, résultats et empreintes de calcul.
- **FR-010** Un dossier émis est en lecture seule (bandeau sur chaque étape) ; « Créer une
  révision » ouvre vN+1 ; les versions émises restent consultables et réimprimables à l'identique.
- **FR-011** Les documents portent le numéro de version et la référence du dossier.

### Besoins — sources (M-21 → M-26, option C)

- **FR-012** Sur une étape Besoins vide, question « De quoi disposez-vous ? » avec cinq réponses :
  liste des appareils, journée type en kW, consommation qui change selon la saison ou le jour de la
  semaine, relevé horaire d'une année, factures.
- **FR-013** Ensuite, barre de sources toujours visible : Appareils · Journée type · Année composée ·
  Année importée · Facture. Changer de source à tout moment ; les données de chaque source sont
  conservées (P-2) ; la source active est seule utilisée.
- **FR-014** Passerelle depuis les appareils : « La consommation change selon la saison ou le
  week-end ? Composer l'année à partir de cet inventaire » (masquable).
- **FR-015** Journée type : tableau Moyenne / Pointe sur 24 h sous un histogramme modifiable à la
  souris ; collage depuis Excel ; pointe = moyenne par défaut (« = ») ; total kWh/j et pointe.
- **FR-016** Année composée : résumé dans la page (frise des 12 mois par type de jour, périodes,
  profils, kWh/an, pointe) ; l'éditeur ajoute l'aperçu du calendrier, le contrôle des dates sans
  profil, « Depuis l'inventaire » et une méthode d'organisation clairement marquée.
- **FR-017** Année importée : stockage propre (distinct de la journée type), fichier, contrôle,
  carte de chaleur jour × heure, chiffres clés, Remplacer / Retirer. Un fichier de 24 lignes va à
  la journée type, un fichier de 8 760 lignes à l'année importée.
- **FR-018** Le profil annuel se lit en carte de chaleur, par mois ou en journée type ; l'axe porte
  les mois, sans les années du fichier météo.

### Besoins — appareils et horaires (M-13 → M-20)

- **FR-019** Un seul tableau : Nom · Qté · P. unitaire · Rendement · Heures · Coef. dém. ·
  Inductif · P. totale · P. réelle · E. totale.
- **FR-020** Coefficient 1 par défaut (classique) ; ≠ 1 coche « Inductif » ; « Inductif » coché à la
  main avec coefficient 1 : coefficient signalé « à préciser » ; décoché : coefficient remis à 1.
- **FR-021** Ligne « Pointe au démarrage » sous le total.
- **FR-022** La simultanéité est supprimée (moteur, domaine, format, Excel, rapports). Projets
  existants : ramenée à 1, avis unique listant les lignes concernées.
- **FR-023** Survol de « Heures » : infobulle avec la frise 00–23 et les plages en clair.
- **FR-024** Clic : fenêtre d'horaire de l'appareil — heures 00–11 et 12–23, peinture au glisser,
  compteur, modèles par plages (08–16, 08–12 + 14–18, 18–24, 22–06, 24 h/24).
- **FR-025** Une durée modifiée ajuste le dernier bloc ; tout écart est signalé.
- **FR-026** « Horaires… » : planning de tous les appareils (grille appareils × 24 h peinte,
  compteur par ligne, courbe de charge en direct) ; remplace la fenêtre « un par un ».

### Dimensionnement et optimisation (M-27 → M-32, M-38)

- **FR-027** « Mes références » : étoile par référence du catalogue, compteur par famille.
- **FR-028** Réglages : plafond Modules et Batteries (10 par défaut), plafond Onduleurs facultatif,
  nombre de propositions (5 par défaut).
- **FR-029** Fenêtre Optimiser (apparence d'écran inchangée) : sources Mes références ou Référence
  fixée ; les onduleurs ajoutent « Tous les onduleurs compatibles » ; plus de choix libre sur tout
  le catalogue pour les modules et batteries.
- **FR-030** Nombre de combinaisons et durée estimée avant lancement ; objectifs expliqués ; limites
  de surdimensionnement repliées.
- **FR-031** Résultats dans la fenêtre : les N meilleurs sont simulés heure par heure (SRI, LPSP,
  coût réels), avec progression et annulation ; « Retenir » remplit les trois composants.
- **FR-032** Sélecteurs manuels : Mes références en tête, puis tri par adéquation au besoin.
- **FR-033** Le faux bouton « Sélectionnez un onduleur » devient un texte d'état.

### Site (M-37)

- **FR-034** Sans météo, le téléchargement est la première action de la page.
- **FR-035** « Mois critique déclaré » est expliqué en langage métier.

### Qualité (M-33 → M-36)

- **FR-036** Tous les textes en français et en anglais ; contrôle automatique étendu.
- **FR-037** Feuilles de style nettoyées (doublons, règles contradictoires) sans régression visuelle.
- **FR-038** Tests unitaires, d'intégration et de bout en bout pour chaque exigence ; captures de
  référence régénérées ; CHANGELOG, README, ROADMAP `UX-001` ; version 1.1.0.

## Hors périmètre (noté pour plus tard)

- Variantes d'inventaire par période et type de jour (l'année se calculerait depuis les appareils).

## Critères de succès

- **SC-001** Un utilisateur nouveau atteint un dossier imprimable depuis le projet exemple en moins
  de 5 minutes, sans documentation.
- **SC-002** Changer de source de consommation puis revenir restitue les données à l'identique.
- **SC-003** Régler les horaires de 10 appareils demande moins d'une minute avec le planning.
- **SC-004** Une optimisation sur 10 × 10 références et tous les onduleurs rend ses propositions
  simulées en moins de 10 s sur un poste courant.
- **SC-005** Un dossier émis ne peut plus être modifié ; sa réimpression est identique.
- **SC-006** `pnpm verify` vert ; aucun texte d'interface en dur.
