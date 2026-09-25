# Tâches — spec 012

## Lot A — Interface
- [x] T001 Barre du haut : Catalogue et Réglages (FR-A1)
- [x] T002 Style unique des listes déroulantes (FR-A2)
- [x] T003 Identification : nom pleine largeur, date, chargé de projet par défaut (FR-A3)
- [x] T004 Panneau de génération à côté de l'aperçu, visuels propres au dossier (FR-A4)
- [x] T005 Fenêtre de composition en trois zones (FR-A5)
- [x] T006 Tests, captures, `pnpm verify:phase`

## Lot B — Schéma unifilaire
- [x] T010 Nature des protections dans la topologie ; parafoudres en dérivation (FR-B3)
- [x] T011 Rotation des symboles au rendu
- [x] T012 Placement paysage gauche → droite, stockage, terre en pied (FR-B1, FR-B5)
- [x] T013 Formats A4/A3 paysage (FR-B2)
- [x] T014 Couloirs d'étiquettes et test géométrique anti-chevauchement (FR-B4)
- [x] T015 Cartouche, décimales, libellés (FR-B6) ; options (FR-B7)
- [x] T016 Intégration écran et rapport, tests, captures

## Lot D — Licences
- [x] T020 Catalogue de fonctions, éditions, durées (FR-D1, FR-D3)
- [x] T021 API d'admin simulée, jetons signés (FR-D2)
- [x] T022 Service de licence : états, grâce, anti-recul, rafraîchissement (FR-D4, FR-D5)
- [x] T023 `useEntitlement`, verrous d'interface (`LockMark`), contrôles de service (mise à jour, émission, création de projet)
- [x] T024 Écrans : activation, badge, alertes, Réglages → Licence, lecture seule (FR-D4 → FR-D6)
- [x] T025 Tests (matrice édition × fonctions, expiration, horloge), E2E

## Lot C — Rapport
- [ ] T030 Pagination A4 de l'aperçu (FR-C1)
- [ ] T031 Mentions internes retirées, synthèse, sommaire (FR-C2, FR-C3)
- [ ] T032 Planche paysage, typographie, pied de page (FR-C4, FR-C5)

## Lot E — Distribution
- [ ] T040 Mises à jour configurées (FR-E1)
- [ ] T041 Installateur aux couleurs KYA (FR-E2)
- [ ] T042 Menu natif, diagnostic (FR-E3)

## Lot F — Usage et avis
- [ ] T050 Consentement, file d'événements, API simulée (FR-F1, FR-F2)
- [ ] T051 Avis et signalements (FR-F3)

## Fermeture
- [ ] T060 CHANGELOG, README, ROADMAP `PROD-001`, version 1.2.0, `pnpm verify`, installateur
- [ ] T061 **Bloquant avant vente réelle** : brancher `HttpAdminApi` sur la plateforme, remplacer `LICENSE_PUBLIC_KEY` par la clé publique de la plateforme, retirer `SimulatedAdminApi`, `DEMO_SIGNING_KEY`, `DEMO_KEYS` et la licence de démonstration automatique (la clé privée de démonstration est publique : tant qu'elle signe, n'importe qui peut forger une licence)
