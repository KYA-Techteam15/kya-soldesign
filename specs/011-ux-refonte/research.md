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

## R5 — Sources de consommation

- L'année importée a son stockage (`annualPoints`) et sa source (`annual`) ; un fichier 1.0 qui
  rangeait 8 760 points dans la journée type est relu en « Année importée », journée type vide.
- `effectiveHourlyPoints` est le seul accès du calcul à la série horaire de la source active.
- La fenêtre de composition est montée à chaque ouverture : elle gardait sinon son premier brouillon
  et ignorait une composition tirée de l'inventaire.
- Le profil annuel perd ses réglages de plage et de fréquence (peu utilisés) au profit de trois
  lectures : carte de chaleur, par mois, journée moyenne ; l'axe porte les mois, sans années.

## R6 — Optimisation

- Les références vivent dans les réglages de l'application (`sizing.favorites`), pas dans le
  projet : elles décrivent l'offre de l'installateur, commune à tous ses dossiers.
- Le tri analytique reste le filtre (quelques ms pour des centaines de combinaisons) ; seules les
  N meilleures sont simulées sur l'année (`simulateRetainedSystem`), environ 60 ms chacune. Le SRI
  et le LPSP affichés sont donc simulés, jamais estimés.
- L'annulation passe par un `AbortSignal` vérifié à chaque cession de la boucle.
- Le sélecteur manuel place l'actuel puis les références en tête ; le reste garde l'ordre du
  catalogue (pas de tri par adéquation, qui supposerait une simulation par ligne).

## R7 — Cycle de vie, accueil, site

- Format : champ facultatif `issue { locked, versions[] }` ; un fichier 1.0 sans ce champ est lu
  « jamais émis », sans migration à écrire. Une version porte l'instantané (nom, entrées,
  sélection, deux enveloppes de calcul) et leurs empreintes (`inputHash`).
- Réimpression : l'instantané est relu sous l'identifiant `<projet>~v<n>` par le même service de
  calcul ; pour ces identifiants, prédimensionnement et dimensionnement enregistrés font foi, même
  si le catalogue a changé depuis. Les documents portent « n° réf · vN » et la date d'émission.
- Verrou : la session refuse toute modification, annulation et rétablissement d'un dossier émis ;
  le service de calcul refuse de relancer (`PROJECT_ISSUED`). Émettre et réviser passent hors de
  l'historique d'annulation. L'écran s'appuie sur un `fieldset disabled` pour les étapes 1 à 7.
- Projet exemple : **écart avec D9** — plutôt qu'un `.ksd` figé embarqué (1,3 Mo de météo et des
  empreintes vouées à périmer à la prochaine évolution du moteur), un modèle d'entrées est complété
  à l'ouverture avec la météo PVGIS déjà livrée, puis calculé par le moteur courant (≈ 3 s).
  L'exemple n'est jamais périmé ; son matériel a été choisi parmi les propositions de
  l'optimisation (onduleur hybride hors réseau) et un test vérifie qu'il existe et reste valide.
- Accueil : « Périmé » = calcul enregistré qui ne correspond plus aux entrées, lu par le service de
  calcul projet après projet, sans bloquer l'affichage.
- Correctif découvert : la vue annuelle prenait pour pointe horaire le plus gros appareil seul ;
  dès que deux appareils tournaient ensemble, la pointe passait sous la puissance moyenne et la
  série était refusée (`PROFILE_PEAK_INVALID`). Elle suit désormais les règles du moteur.

## Baselines modifiées

| Test | Avant | Après | Raison |
|---|---|---|---|
| `page1-load.unit` (pompe) | 2 500 Wh, 625 W en marche | 5 000 Wh, 1 250 W | simultanéité 0,5 retirée |
| `domain load.unit` / `aio.unit` | 400 Wh / 200 Wh | 800 Wh / 400 Wh | idem |
| `page1-aio.integration` | 4 lampes × 0,5 | 2 lampes × 1 | mêmes 160 Wh / 40 W, sans simultanéité |
| Captures `needs-*`, `site-real-*` | deux tableaux, panneau ouvert | tableau unique, bilan dans la page, panneau replié | FR-002, FR-019 |
| Captures `catalog-*` | sans colonne étoile | colonne ★ et filtre Mes références | FR-027 |
| Captures `equipment-*` | faux bouton « Sélectionnez un onduleur » | texte d'état | FR-033 |
| E2E réglages | 6 catégories | 7 (Dimensionnement et optimisation) | FR-028 |
| Captures `home-*`, `palette-*` | héros, chiffres cumulés, cartes système | premier lancement en trois cartes | FR-004, FR-006, P-1 |
| Captures `dossier-*` | — | panneau « Émission » en tête | FR-009 |
| Captures `site-real-*` | — | note « Mois critique » | FR-035 |
| E2E `navigation`, `i18n`, `canonical-project` | titre « Concevez des systèmes… » | « Bienvenue dans KYA-SolDesign », tableau de bord | FR-004, FR-005 |
