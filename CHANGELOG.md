# Journal des modifications

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
