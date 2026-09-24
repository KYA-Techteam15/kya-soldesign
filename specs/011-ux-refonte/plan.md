# Implementation Plan: Refonte UX (UX-001)

**Branch**: `feat/011-ux-refonte` · **Spec**: `spec.md` · **Base**: `dev` (contient la 010)

## Contexte technique

Monorepo pnpm : `packages/engine` (calculs purs), `packages/domain` (schémas), `apps/desktop`
(React 19, Vite, Tauri 2). Le projet est persisté en `ProjectFileV1` dont les entrées sont validées
par `projectInputs.ts` (Zod strict) ; l'interface travaille sur `ProjectViewModel`
(`projectView.ts`), converti par `projectAdapters.ts`. Toute modification de format reste
**rétrocompatible en lecture** (constitution : aucun projet existant ne devient illisible).

## Décisions de conception

### D1 — Sources de consommation (FR-012 → FR-017, P-2)

| Source affichée | Stockage | Actif quand |
|---|---|---|
| Appareils | `profile.items` | `activeMode = simple`, `profile.source = equipment` |
| Journée type | `profile.hourlyPoints` (24) | `simple`, `source = hourly` |
| Année composée | `load.composed` | `activeMode = composed` |
| Année importée | **nouveau** `profile.annualPoints` (8 760) | `simple`, **nouveau** `source = annual` |
| Facture | `profile.meter` | `simple`, `source = meter` |

- Changer de source ne modifie que `activeMode` / `source` ; aucune donnée n'est effacée.
- Lecture des anciens fichiers : `source = hourly` avec 8 760 points → `annualPoints`, source
  `annual`, journée type vide (24 × 0). L'écriture produit toujours 24 points dans `hourlyPoints`.
- `projectToAio` : la source `annual` remplace l'ancien test « hourly de longueur 8 760 ».
- « Étape vide » (FR-012) : aucun appareil, journée type nulle, pas de composition, pas d'année
  importée, facture sans énergie.

### D2 — Tableau unique d'appareils (FR-019 → FR-021)

- Vue : `profile.appliances[]` remplace `classic[]` + `inductive[]` ; chaque ligne porte
  `startupCoef` (≥ 1, défaut 1) et `inductive` (booléen).
- Fichier : `items[]` inchangé ; `startupPowerMultiplier = coef > 1 ? coef : null` ; nouveau champ
  facultatif `inductive: true` pour une case cochée à la main avec coefficient 1.
- Règles : saisir coef ≠ 1 → `inductive = true` ; décocher → coef = 1 ; cocher avec coef 1 →
  indicateur « à préciser » (aucun effet de calcul tant que le coefficient vaut 1).
- Pointe au démarrage : issue des événements de démarrage déjà calculés par le moteur.

### D3 — Suppression de la simultanéité (FR-022)

- Moteur : `EquipmentScheduleRow.simultaneityRatio` supprimé ; P. réelle = P. totale / rendement.
- Domaine : `LoadItem.simultaneityRatio` supprimé.
- Fichier : `simultaneityRatio` accepté en lecture (facultatif), jamais écrit. À la lecture, les
  lignes dont la simultanéité ≠ 1 sont listées dans `load.simultaneityNotice` (persisté jusqu'à
  fermeture de l'avis).
- Excel : colonne retirée à l'export, ignorée à l'import.
- Baselines : un projet avec simultanéité < 1 voit son énergie augmenter — noté dans `research.md`.

### D4 — Horaires (FR-023 → FR-026, P-3)

- Composants : `HoursStrip` (frise 24 cases, lecture), `HoursPopover` (un appareil, peinture au
  glisser, modèles par plages), `HoursPlanner` (tous les appareils, remplace
  `OperatingHoursDialog`). Moteur inchangé : `operatingFractionsForSelectedHours`.
- Modèles : 08–16, 08–12 + 14–18, 18–24, 22–06, 24 h/24 ; libellés = plages horaires.

### D5 — Journée type (FR-015)

- Pointe nulle = « = moyenne » (`peakPowerW: null` existe déjà dans le fichier) ; la vue passe
  `peakPower` en `number | null`.
- Histogramme SVG, glisser vertical sur une barre pour fixer la moyenne ; collage d'une ligne ou de
  deux lignes de 24 valeurs.

### D6 — Année composée et importée (FR-016 → FR-018)

- Résumé de composition : frise mois × types de jour calculée depuis le calendrier existant.
- « Depuis l'inventaire » : un profil direct = puissance horaire moyenne des appareils (moteur
  `normalizeEquipmentRows`), pointes comprises.
- Année importée : carte de chaleur 365 × 24 (canvas), chiffres clés, Remplacer / Retirer.

### D7 — Optimisation (FR-027 → FR-032)

- `Mes références` : réglage applicatif (`settings.sizing.favorites` par famille) ; plafonds et
  nombre de propositions dans `settings.sizing`.
- Moteur : `optimizeSizing` inchangé pour l'examen ; simulation horaire des N premiers par la
  simulation unifiée existante (`simulateRetainedSystem` / bilan horaire) ; annulation par signal.

### D8 — Cycle de vie (FR-008 → FR-011)

- Projet : `issue: { versions: IssuedVersionV1[]; locked: boolean }` ; une version fige les entrées,
  les enveloppes de calcul, leurs empreintes, la date et la référence.
- Verrouillage appliqué au niveau de la session (toute mutation refusée si `locked`) ; « Créer une
  révision » déverrouille et incrémente.
- Les documents d'une version émise se régénèrent depuis son instantané.

### D9 — Accueil et panneau (FR-001 → FR-007)

- Accueil : premier lancement ou tableau de bord selon l'existence de projets ; état dérivé du cycle
  de vie et des faits de calcul ; projet exemple = fichier `.ksd` embarqué, importé comme copie.
- Panneau de droite : replié par défaut tant que `lastCalculation` est nul ; préférence mémorisée.

## Lots de réalisation

| Lot | Contenu | Exigences |
|---|---|---|
| 1 | Navigation, panneau, P-1, appareils, simultanéité, horaires | FR-001 → FR-003, FR-019 → FR-026 |
| 2 | Sources, journée type, années composée et importée, profil annuel | FR-012 → FR-018 |
| 3 | Optimisation, références, sélecteurs, faux bouton | FR-027 → FR-033 |
| 4 | Accueil, projet exemple, cycle de vie, site | FR-004 → FR-011, FR-034, FR-035 |
| 5 | Traductions, style, tests, documentation, version | FR-036 → FR-038 |

Porte après chaque lot : `pnpm verify:phase` ; fermeture : `pnpm verify`.
