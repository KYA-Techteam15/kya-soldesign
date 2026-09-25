# Plan — spec 012

## D1 — Schéma unifilaire (lot B)

- Topologie inchangée dans son principe ; les protections portent leur **nature** (`fuse`,
  `breaker`, `switch-disconnector`) déduite du type retenu à l'étape « Protections ».
- Nouveau placement `layout/landscape.ts` : colonnes de gauche à droite, symboles dessinés dans leur
  repère vertical puis **tournés de −90°** au rendu quand le courant circule horizontalement.
- Parafoudres placés en dérivation : un piquage sur la liaison, le parafoudre, puis la terre.
- Collecteur de terre horizontal en pied de planche, une borne par raccordement.
- Étiquettes posées dans des couloirs au-dessus/au-dessous des liaisons ; test géométrique :
  aucune boîte de texte n'intersecte un segment de conducteur ni un autre texte.
- Formats A4/A3 paysage ; l'ancien placement vertical est retiré.

## D2 — Licences (lot D)

- `LicensePort` étendu : `readState`, `activate(key)`, `refresh()`, `release()`.
- `SimulatedAdminApi` : catalogue des éditions et durées, clés de démonstration, émission de jetons
  signés ECDSA P-256 (WebCrypto), horloge serveur. Remplaçable par `HttpAdminApi`.
- `LicenseService` : vérifie la signature, calcule l'état (active, grâce, expirée, lecture seule),
  mémorise la dernière date vue (anti-recul), planifie le rafraîchissement.
- `useEntitlement(feature)` / `<Gate>` ; `assertEntitled` dans les services.

## D3 — Matrice proposée (simulée, à confirmer)

| Fonction | Commerciale | Académique | Étudiant |
|---|---|---|---|
| Système autonome AIO, calculs complets | ✓ | ✓ | ✓ |
| Optimisation « Mes références » | ✓ | ✓ | — |
| Export Word | ✓ | ✓ | — (impression PDF seulement) |
| Facture proforma, prix de vente | ✓ | — | — |
| Émission et révisions du dossier | ✓ | ✓ | — |
| Matériel utilisateur au catalogue | ✓ | ✓ | — |
| Nombre de projets | illimité | illimité | 5 |
| Filigrane sur les documents | — | « Usage académique » | « Usage étudiant » |
| Postes | 1 par licence (réglable) | 1 | 1 |

Durées : Commerciale 1 mois, 3 mois, 12 mois · Académique 12 mois · Étudiant 1 jour, 1 mois.
Grâce après échéance : 7 jours (Commerciale), 3 jours (Académique), aucune (Étudiant).

## D4 — Usage et avis (lot F)

- File d'événements locale, envoi groupé à l'API simulée ; aucun contenu de projet.
- Avis et signalements stockés côté API simulée, avec réponses consultables.

## Ordre

A → B → D → C → E → F. Chaque lot : tests unitaires, E2E, captures, `pnpm verify:phase`, commit.
