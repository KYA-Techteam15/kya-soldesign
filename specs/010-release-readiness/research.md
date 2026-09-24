# Research — 010 Release readiness

## R1. Voc à froid (FR-001)

- Relation : `Voc(T) = Voc_STC · (1 + β_Voc · (T_cell − 25 °C))` — IEC 61215 / fiches constructeur ;
  IEC 62548:2016 §7.2 impose le Voc maximal à la température de cellule la plus basse attendue.
- β_Voc est négatif pour le silicium (≈ −0,25 à −0,35 %/°C). Le catalogue stocke des fractions par °C
  signées (−0,0028). L'ancien code faisait `(T_ref − T_froid)` : signe inversé ⇒ Voc sous-estimé.
- Température de cellule la plus froide ≈ température ambiante minimale (irradiance quasi nulle au
  lever du jour). Proxy : minimum horaire de T2m de l'année type PVGIS, arrondi à l'entier inférieur,
  modifiable par l'ingénieur (donnée de conception, non inventée).

## R2. Bilan horaire unique (FR-003, FR-004)

Par heure h, avec PV en kWh DC, charge en kWh AC :

```
pv_dc      = P_c · G_poa(h)/1000 · PR
direct_ac  = min(charge, pv_dc · η_ond, P_ond)
reste_ac   = charge − direct_ac
capacité   = P_ond − direct_ac                         (plafond onduleur partagé)
dech_ac    = min(reste_ac, capacité, stock · η_bat · η_ond)
stock     −= dech_ac / (η_bat · η_ond)
surplus_dc = pv_dc − direct_ac / η_ond
stock      = min(S, stock + surplus_dc · η_bat)
```

`η_bat` appliqué à la charge et à la décharge : convention historique des deux moteurs, conservée.
`S` est l'énergie **utile** : le dimensionnement convertit ensuite en nominal par la DoD
(`batteryParallel = S / DoD / ...`), ce qui rend la DoD absente du prédimensionnement cohérente.
État initial : on simule une année de mise en régime (stock initial = S/2), puis l'année mesurée
repart de l'état final ⇒ résultat indépendant d'un choix arbitraire.

## R3. Protections (FR-005)

- Courant côté batterie maximal quand la tension est au seuil bas et le rendement pris en compte :
  `I = P_ond / (η_ond · V_min)`, facteur 1,25 (IEC 60364-7-712 / guide UTE C15-712-2).
- `V_min = 0,875 · V_nom` : plomb 1,75 V/élément sur 2,0 V ; LFP 2,8 V sur 3,2 V.
- Séries : IEC 60898-1 (6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125 A) ; IEC 60947-2 boîtiers
  moulés (160, 200, 250, 320, 400, 500, 630 A) ; IEC 60269 gG (… 400, 500, 630 A) ; gPV IEC 60269-6.

## R4. Câbles (FR-006)

Courants admissibles, PVC 70 °C, deux conducteurs chargés — IEC 60364-5-52:2009, tableau B.52.2
(cuivre) et B.52.3 (aluminium) ; méthode C (fixé sur paroi, « non enterré ») et D1 (conduits
enterrés). Facteurs de température : tableau B.52.14 (air, réf. 30 °C) et B.52.15 (sol, réf. 20 °C).
Les valeurs sont transcrites dans `packages/engine/src/protection-cabling/iec60364.ts`.
**Vérification humaine requise** contre l'exemplaire normatif avant publication (checklist).

Critère : `I_z · k_T ≥ I_B` puis chute de tension `ΔU = b · ρ · L · I / S ≤ ΔU_max`.

## R5. Arbres équivalents (FR-009)

22 kg CO₂ absorbés par arbre et par an — valeur de vulgarisation de l'Agence européenne pour
l'environnement. Présentée comme ordre de grandeur, source citée dans la trace.

## R6. Persistance (FR-011, FR-038)

- Navigateur : IndexedDB `kya-sol-design` / magasin `projects` (clé `id`), un enregistrement par projet.
- Tauri : SQLite via `tauri-plugin-sql`, table `projects(id TEXT PRIMARY KEY, json TEXT, updated_at TEXT)`.
- Le port reste synchrone en lecture (cache mémoire hydraté au démarrage) et asynchrone en écriture
  (file sérialisée par projet, dernière valeur gagnante, erreurs publiées).
- Migration : au premier démarrage, les projets de `localStorage['kya-sol-design.projects.v1']` sont
  copiés dans le dépôt puis la clé est renommée `.migrated` (réversible).

## R7. Réseau sous Tauri (FR-036)

`tauri-plugin-http` expose `fetch` côté Rust (pas de CORS). Portée : `https://re.jrc.ec.europa.eu/api/*`,
`https://geocoding-api.open-meteo.com/*`, `https://customer-geocoding-api.open-meteo.com/*`,
`https://api.bigdatacloud.net/*`. Les clients reçoivent un `fetch` injecté et l'URL fournisseur réelle
au lieu du chemin `/external/*` du proxy de développement.

Open-Meteo : usage commercial soumis à abonnement ; `VITE_OPEN_METEO_API_KEY` bascule sur le
domaine `customer-*` (décision du demandeur).

## R8. Dépendances

- `xlsx` : la distribution npm s'arrête à 0.18.5 (CVE-2023-30533, CVE-2024-22363). SheetJS publie la
  0.20.3 corrigée sur `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (même API).

## Baselines modifiées

Consignées ici au fil de l'implémentation, avec la raison, l'ancienne et la nouvelle valeur.

### Phase 1 — 2026-09-23

| Grandeur | Avant | Après | Raison |
|---|---|---|---|
| Voc à froid | `Voc·(1 + β·(25 − T_froid))`, β négatif ⇒ Voc réduit | `Voc·(1 + β·(T_froid − 25))` avec β ≤ 0 | C-01, IEC 62548 §7.2 |
| Température froide | 0 °C fixe | minimum T2m de la série, ou saisie | C-02 |
| Bilan horaire | deux boucles divergentes, batterie pleine au départ | `simulateHourlyEnergyBalance` + année de mise en régime | C-03, C-04 |
| Courant batterie | `1,25·P/U_nom` | `1,25·P/(η·0,875·U_nom)` | C-05 |
| Calibre sans couverture | courant requis présenté comme calibre (« estimé ») | état `out-of-range`, aucun calibre | C-05 |
| Calibre sans choix | plus petit calibre appliqué d'office | proposé (`recommendedRatingA`), non appliqué | C-14 |
| Section thermique | `I/5` (Cu) ou `I/3` (Al) mm² | tableaux IEC 60364-5-52, méthode C/D1, k_T | C-05 |
| Arbres équivalents | `CO₂_vie / 22` (arbres-années) | `CO₂_vie / (22 · durée)` | FR-009 |
| Montants | flottants | entiers arrondis par ligne | C-06 |

Aucun jeu golden AIO n'a changé (`aio.golden.test.ts` vert). Les tests unitaires des protections ont été
réécrits pour la nouvelle sémantique ; ceux du dimensionnement gagnent des cas à β négatif réel.
