# Journal des modifications

## 1.1.0 — 2026-09-24

Refonte de l'expérience de bout en bout (spécification `specs/011-ux-refonte`, `UX-001`).
Principe : toute information affichée aide l'utilisateur, sinon elle est supprimée.

### Besoins

- **Un seul tableau d'appareils** : coefficient de démarrage (1 par défaut) puis case
  « Inductif » ; ligne « Pointe au démarrage » sous le total.
- **Simultanéité supprimée** partout ; les anciens projets concernés sont signalés une fois.
- **Horaires** : survol pour voir les heures, clic pour les peindre (00–23, modèles
  « 08–16 », « 18–24 »…), planning de tous les appareils ; aucun libellé de moment de la
  journée, qui dépend du pays.
- **Sources de consommation** : « De quoi disposez-vous ? » à la première saisie, puis
  appareils, journée type, année composée, année importée ou facture ; chaque source garde
  ses données, seule la source active alimente les calculs.
- Vue annuelle en carte de chaleur, par mois ou en journée moyenne.

### Dimensionnement

- **Mes références** : étoiles dans le catalogue, plafonds par famille dans les réglages.
- **Optimiser…** : combinaisons de vos références, estimation de durée, objectifs expliqués,
  progression et annulation ; les meilleures propositions sont **simulées sur l'année**
  (SRI, LPSP) et rien n'est retenu sans « Retenir ».

### Dossier

- **Émettre le dossier vN** : version figée, datée et numérotée, lecture seule sur toutes les
  étapes, « Créer une révision » ; les versions émises restent réimprimables à l'identique et
  les documents portent la référence et la version.
- Bouton « Préparer les documents client » à l'étape 8.

### Accueil et site

- Premier lancement en trois cartes (société, projet exemple, nouveau projet), puis tableau
  de bord : reprendre là où le dossier attend, états (brouillon, en cours, prêt, émis,
  révision, périmé), filtres et recherche.
- Architectures : le système disponible est présenté avec son schéma ; chaque architecture à
  venir montre le sien au survol.
- **Projet exemple** : centre de santé à Bombouaka, calculé à l'ouverture par le moteur courant.
- Site : la météo passe en tête tant qu'elle manque ; « Mois critique » expliqué.
- Panneau de droite replié tant qu'aucun prédimensionnement n'existe, et plus étroit.

### Corrections

- Sections de câble calculées sur le calibre suggéré ; calibre suggéré retenu par défaut.
- Vue annuelle refusée dès que deux appareils tournaient à la même heure.
- Tableaux larges défilant horizontalement sans replier le panneau de droite.

### Qualité

- Contrôle des traductions étendu (clés inutilisées, jetons identiques en français et en
  anglais) ; 238 textes morts retirés ; feuilles de style allégées de 25 Ko sans changement
  visuel.

## 1.0.0 — 2026-09-24

Première version distribuée aux clients (spécification `specs/010-release-readiness`).

### Calculs

- **Voc à froid** : signe du coefficient corrigé (le Voc augmente quand la cellule refroidit) ;
  un coefficient positif du catalogue est traité comme une erreur de signe et signalé.
- **Température minimale de conception** issue de la série météo du site (modifiable),
  au lieu de 0 °C pour tous les sites.
- **Bilan horaire unique** pour le prédimensionnement et le système retenu : rendement
  onduleur en décharge, plafond de puissance onduleur, année de mise en régime.
- **Protections** : courant batterie au seuil de coupure et à travers le rendement,
  gammes normalisées étendues, aucun calibre hors série ni appliqué d'office.
- **Câbles** : courants admissibles IEC 60364-5-52 (méthodes C et D1), facteur de
  température, mode de pose pris en compte.
- Montants en unités entières, traces de calcul publiées, équivalent arbres corrigé.

### Fiabilité et données

- Projets enregistrés un par un (SQLite sur le poste), sans limite de nombre ;
  échec d'enregistrement visible avec « Réessayer », jamais silencieux.
- Annulation par projet, suppression annulable depuis la notification.
- Sauvegarde automatique au démarrage, sauvegarde et restauration manuelles.
- Écran de reprise en cas d'erreur, journal technique, signalement d'un problème.

### Cohérence

- Chiffrage, dossier et documents bloqués sur un dimensionnement périmé ; le
  dimensionnement devient lui-même périmé dès que les besoins ou le site changent
  après le prédimensionnement.
- Prix unitaires automatiques qui suivent le matériel retenu ; prix saisis signalés.
- Liste d'onduleurs, schéma et protections alignés sur le moteur.
- Documents datés (émission, validité), chargé de projet, lignes nulles masquées.

### Interface

- Interface entièrement bilingue (français, anglais), devise unique par projet.
- Dialogues accessibles au clavier, sans perte de saisie au clic extérieur.
- Saisie fluide : plus de gel lors des modifications.

### Qualité

- Parcours de bout en bout (création → Word, français et anglais) vérifiés sur la
  version construite, celle qui est livrée ; contrôle des textes en dur étendu.

### Bureau

- Application Tauri : installateur Windows avec WebView2 hors ligne, fichiers `.ksd`,
  boîtes de dialogue natives, téléchargements météo sans serveur intermédiaire.

## 0.1.0 — 2026-08-27

Accueil, catalogue, réglages et rapports transversaux (préversion interne).
