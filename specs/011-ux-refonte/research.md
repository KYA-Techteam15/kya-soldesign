# Research: Refonte UX (UX-001)

## R1 — Suppression de la simultanéité

- **Décision** : le coefficient de simultanéité disparaît du moteur, du domaine, du format et de
  l'interface. P. réelle = P. utile × quantité ÷ rendement.
- **Raison** : le demandeur la juge source d'erreur ; la quantité et les heures d'usage décrivent
  déjà ce qu'elle approximait, de façon vérifiable.
- **Migration** : un projet 1.0 dont une ligne avait une simultanéité < 1 affiche une fois la liste
  des appareils concernés (`load.simultaneityNotice`) ; l'énergie de ces lignes augmente.

## R2 — Pointe au démarrage

- Une seule règle, `hourlyPeakPowerWithStartupsW` (moteur) : à l'heure du démarrage, la pointe
  ajoute P. en marche × (coefficient − 1). Le tableau des besoins (`equipmentStartupPeakW`) et le
  dimensionnement (`projectToAio`) l'appellent tous deux.

## R3 — Durée et horaire

- Modifier la durée ajuste le dernier bloc de la journée (`resizeOperatingSchedule`) au lieu de
  replacer tout l'horaire à 08 h.
- Peindre un horaire dont le nombre d'heures diffère de la durée fait suivre la durée au dessin
  (annoncé avant validation) : le dessin fait foi, rien n'est bloqué.

## R4 — Tests et copie compilée du domaine

- Vitest résolvait `@ksd/domain` vers `dist/` (copie compilée, parfois périmée). Un alias de test
  impose désormais la source ; l'outil Node d'import garde `dist/`, construit par `tsc -b`.

## Baselines modifiées

| Test | Avant | Après | Raison |
|---|---|---|---|
| `page1-load.unit` (pompe) | 2 500 Wh, 625 W en marche | 5 000 Wh, 1 250 W | simultanéité 0,5 retirée |
| `domain load.unit` / `aio.unit` | 400 Wh / 200 Wh | 800 Wh / 400 Wh | idem |
| `page1-aio.integration` | 4 lampes × 0,5 | 2 lampes × 1 | mêmes 160 Wh / 40 W, sans simultanéité |
| Captures `needs-*`, `site-real-*` | deux tableaux, panneau ouvert | tableau unique, bilan dans la page, panneau replié | FR-002, FR-019 |
