# Journal des modifications

## Non publié

### Licences (spec 012, T061)

- Les licences viennent de la **plateforme KYA-EnergyMarket** (`/api/software/v1`) : activation,
  rafraîchissement et libération du poste. Le logiciel n'embarque plus que les **clés publiques**
  de la plateforme : la simulation, ses clés de démonstration et sa clé de signature sont retirées.
- **Premier lancement sans licence** : le logiciel s'ouvre en lecture seule et propose l'essai
  gratuit ou l'achat sur KYA-EnergyMarket (Réglages → Licence).
- Le logiciel **accepte ce qu'il ne connaît pas** : une fonction ajoutée par la plateforme est
  ignorée, une durée nouvelle s'affiche en jours (« 14 jours »), une édition inconnue ouvre la
  licence en lecture seule avec « Mise à jour nécessaire ».
- La construction choisit la plateforme (`VITE_PLATFORM_ENV` : `dev` tant que la production
  n'est pas ouverte, puis `production`).

## 1.2.1 — 2026-09-25

- **Mises à jour** : KYA-SolDesign cherche une nouvelle version à chaque démarrage, et non plus une
  fois par jour. Une version publiée le jour même vous est proposée dès le prochain lancement.
- Première mise à jour livrée automatiquement : si vous lisez ces lignes dans la fenêtre
  « Nouvelle version », la chaîne de mise à jour fonctionne.

## 1.2.0 — 2026-09-25

Mise en production (spécification `specs/012-mise-en-production`, `PROD-001`).

### Licences

- **Éditions** Commerciale (mois, trimestre, année), Académique (année) et Étudiant (jour,
  mois). Chacune ouvre ses fonctions : optimisation, export Word, prix et proforma, émission du
  dossier, matériel ajouté au catalogue, nombre de projets ; filigrane imposé en Académique et
  Étudiant.
- **Temps restant** suivi en continu : pastille « Commerciale · 342 j » dans la barre d'état,
  alertes à J-30, J-7 et J-1, délai de grâce puis **lecture seule** (projets consultables et
  imprimables). Protections contre le recul de l'horloge et l'absence prolongée de vérification.
- **Réglages → Licence** : activer une clé, rafraîchir, libérer le poste, fonctions ouvertes.
- La plateforme d'administration est **simulée** dans cette version (clés de démonstration,
  licence commerciale de démonstration au premier lancement).

### Rapport

- **Vraies pages A4** : le contenu est réparti feuille par feuille, les tableaux longs se
  poursuivent avec leur en-tête, un titre ne reste jamais seul en bas de page ; l'impression
  sort exactement les feuilles de l'aperçu.
- **Correctif** : l'impression depuis l'onglet Documents sortait une page blanche.
- Sommaire paginé, synthèse en une ligne, pied « réf · version · page x / y ».
- Mentions internes retirées (couples évalués, empreinte du fichier météo) ; textes et nombres
  dans leurs polices ; plus de barres verticales orange.

### Schéma unifilaire

- Planche paysage lue de gauche à droite, vrai unifilaire (nombre de conducteurs sur les
  câbles), nature réelle des protections, parafoudres en dérivation vers la borne de terre.
- Format choisi automatiquement (A4 à A2) pour rester lisible, aucun chevauchement de texte.

### Interface

- Catalogue et Réglages accessibles de partout ; listes déroulantes au même style.
- Identification : nom en pleine largeur, date, chargé de projet par défaut.
- Documents : composition à côté de l'aperçu, logo et page de garde propres au dossier.
- Composition de l'année en trois zones.

### Distribution

- **Mises à jour** : canal stable ou bêta, vérification quotidienne, boîte « Nouvelle version »
  avec ses notes, installation sans question.
- **Menu** Fichier / Aide : nouveau projet (Ctrl+N), ouvrir (Ctrl+O), exporter (Ctrl+S),
  projets récents, journaux, « Copier les infos de diagnostic ».
- Installateur aux couleurs KYA ; à la désinstallation, les données sont conservées sauf si
  l'on coche leur suppression.

### Avis et usage

- Statistiques d'usage **anonymes**, seulement avec votre accord (demandé une fois, modifiable).
- « Donner un avis » et « Signaler un problème » : les messages partent vers l'équipe, les
  réponses s'affichent dans **Réglages → Avis et assistance**.

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
