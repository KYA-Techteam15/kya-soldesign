# Spec 012 — Mise en production (`PROD-001`)

**Statut** : en cours · **Branche** : `feat/012-mise-en-production` · **Dépend de** : `UX-001` (spec 011)

## Objectif

Rendre KYA-SolDesign distribuable à des clients : interface finie, schéma unifilaire juste et
lisible, rapport paginé, licences par édition et par durée, mises à jour, remontée d'usage et d'avis.
Les licences et la remontée s'appuient sur une **API d'administration simulée** dans l'application ;
elle sera remplacée par l'API réelle de la plateforme d'admin sans toucher aux écrans.

## Principes

- **P-1** (hérité) : toute information affichée aide l'utilisateur, sinon elle est supprimée.
- **P-5 Le plan dit vrai** : un symbole correspond à l'appareil réellement retenu ; aucun texte ne
  touche un conducteur ni un symbole ; la planche a le format annoncé.
- **P-6 Les droits viennent de l'admin** : le code ne connaît que des identifiants de fonction ; le
  lien édition → fonctions et les durées vivent côté plateforme (ici : simulée).
- **P-7 Les données du client ne sont jamais prises en otage** : licence expirée = lecture seule,
  jamais de projet inaccessible.
- **P-8 Rien ne part sans consentement** : statistiques anonymes et sans contenu de projet.

## Exigences

### Lot A — Interface
- **FR-A1** Entrées permanentes « Catalogue » et « Réglages » dans la barre du haut, sur tous les écrans.
- **FR-A2** Listes déroulantes au style unique (hauteur, bordure, flèche, focus, mode sombre).
- **FR-A3** Identification : nom du projet pleine largeur, date au sélecteur local, chargé de projet
  prérempli depuis les réglages (nouveau réglage « Chargé de projet par défaut »).
- **FR-A4** Génération des documents : panneau à côté de l'aperçu (plus de fenêtre étroite) ; sections
  groupées ; options ; visuels « de la société » ou « propres à ce dossier » (logo, couverture), ces
  derniers enregistrés dans le projet et embarqués dans l'export `.ksd`.
- **FR-A5** Composition de l'année : organisation, calendrier et profil visibles sans défilement ;
  profil édité avec l'éditeur de la journée type ; périodes au sélecteur jour + mois ; texte à jour.

### Lot B — Schéma unifilaire
- **FR-B1** Planche **paysage** lue de gauche à droite : champ PV → protections DC → onduleur →
  protections AC → tableau et charges ; stockage sous l'onduleur ; terre en pied de planche.
- **FR-B2** Format réel : A4 ou A3 paysage, choisi automatiquement (plus petit lisible) ou imposé.
- **FR-B3** Symbole selon l'appareil retenu : fusible gPV (avec sectionneur), disjoncteur DC,
  interrupteur-sectionneur ; parafoudres **en dérivation** vers la terre, non en série.
- **FR-B4** Aucun texte sur un conducteur ou un symbole : couloirs d'étiquettes ; contrôle géométrique
  automatique dans les tests.
- **FR-B5** Collecteur de terre dimensionné au nombre de raccordements ; barrette et prise de terre.
- **FR-B6** Cartouche : textes tronqués proprement, chargé de projet, version du dossier (vN) ;
  décimales à la langue ; « 1 × 48 V · 150 Ah » au lieu de « 1S × 1P ».
- **FR-B7** Souplesse : format, niveau de détail, cotes de câble, légende, nomenclature sur planche.

### Lot C — Rapport
- **FR-C1** Aperçu découpé en pages A4, « page x / y ».
- **FR-C2** Mentions internes retirées (compteurs de balayage, jargon).
- **FR-C3** Page de synthèse pour le décideur ; sommaire.
- **FR-C4** Schéma en page paysage pleine page.
- **FR-C5** Hiérarchie typographique affirmée ; plus de barre verticale orange ; pied de page
  « référence · vN · page x / y ».

### Lot D — Licences et éditions (API simulée)
- **FR-D1** Éditions et durées : **Commerciale** (1 mois, 3 mois, 12 mois) ; **Académique** (12 mois) ;
  **Étudiant** (1 jour, 1 mois).
- **FR-D2** Jeton de licence signé (ECDSA P-256) : licence, client, édition, droits, début, fin, grâce,
  poste. Vérifié hors ligne ; rafraîchi périodiquement auprès de l'API (simulée).
- **FR-D3** Catalogue de fonctions typé ; un seul point de décision (`useEntitlement`) et un
  composant `<Gate>` ; contrôle aussi dans les services (export, émission, optimisation).
- **FR-D4** Temps restant suivi dynamiquement : badge dans la barre d'état, alertes J-30 / J-7 / J-1,
  page Réglages → Licence ; protection contre le recul de l'horloge.
- **FR-D5** Expiration : grâce, puis lecture seule (P-7).
- **FR-D6** Activation par clé, libération du poste.

### Lot E — Distribution
- **FR-E1** Mises à jour : configuration complète, canal stable et beta, boîte « Nouvelle version »
  avec notes, installation `passive`. La génération des clés reste une action du propriétaire.
- **FR-E2** Installateur aux couleurs KYA ; conserver ou supprimer les données à la désinstallation.
- **FR-E3** Menu natif (Fichiers récents, Ctrl+S / Ctrl+O, mises à jour, journaux) ; « Copier les infos
  de diagnostic ».

### Lot F — Usage et avis (API simulée)
- **FR-F1** Consentement au premier lancement, modifiable.
- **FR-F2** Événements d'usage anonymes, mis en file et envoyés à l'API (simulée).
- **FR-F3** « Donner un avis » et « Signaler un problème » vers l'API ; réponses visibles dans l'app.

## Hypothèses à valider
- Matrice édition × fonctions (voir `plan.md`, D3) : proposée, à confirmer par l'admin.
- Journée retenue pour le prédimensionnement d'une année composée (moyenne ou la plus chargée) : en
  attente de décision ; comportement actuel conservé (journée moyenne).
