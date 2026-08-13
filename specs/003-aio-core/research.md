# Recherche, registre historique et décisions scientifiques

## Sources indépendantes retenues

| ID | Source/version | Domaine applicable | Usage dans AIO |
|---|---|---|---|
| `SRC-AIO-001` | [IEEE 1562-2021](https://standards.ieee.org/ieee/1562/10272/), IEEE Recommended Practice for Sizing Stand-Alone PV Systems, active, 2021-09-03 | PV autonome, PV seule source de charge; batterie plomb; exclut hybride/raccordé et dimensionnement onduleur | cadre de dimensionnement array/batterie, limites de domaine |
| `SRC-AIO-002` | [Sandia, rapport de systèmes PV autonomes, OSTI 918348](https://www.osti.gov/servlets/purl/918348) | systèmes autonomes; définit insolation journalière, heures solaires, rendement onduleur/batterie et jours d'autonomie | unités, définition PSH, besoin d'une ressource réelle et pertes distinctes |
| `SRC-AIO-003` | [BIPM, SI Brochure, 9e éd. (2019), mise à jour 2026](https://www.bipm.org/en/publications/si-brochure) | unités physiques | relation puissance/énergie et unités canoniques |
| `SRC-AIO-004` | [IEA PVPS T18-01:2022](https://iea-pvps.org/wp-content/uploads/2022/08/PVPS-T18-01-2022_Blueprint-for-Feasibility-Studies-Off-Grid-PV.pdf) | études off-grid/hybrides | impose de déclarer contraintes et hypothèses; réserve la simulation aux modèles techniques ultérieurs |
| `SRC-AIO-005` | [IEEE 1013-2019](https://standards.ieee.org/ieee/1562/10272/) (référence associée IEEE) | batterie plomb autonome | confirme que le dimensionnement de capacité dépend de la chimie; pas d'extension silencieuse aux autres chimies |

`SRC-AIO-001` remplace IEEE 1562-2007. Les documents IEEE sont des références normatives identifiables; leur texte intégral sous licence doit être consulté par le responsable technique si une évolution de formule ou de baseline est demandée.

## Décisions de recherche

| ID | Décision | Raison | Alternatives écartées |
|---|---|---|---|
| `DEC-AIO-001` | Conserver uniquement le prédimensionnement analytique à pas journalier et la charge à 24 intervalles. | Il satisfait l'intention AIO sans simuler une année météo/SOC. | Portage du balayage 121 configurations : mélange SIM/FIN et manque de preuve indépendante. |
| `DEC-AIO-002` | Utiliser l'irradiation moyenne journalière du mois de conception sur le plan du champ; `PSH_h = H_poa_kWhPerM2PerDay / 1 kW/m²`. | La source Sandia définit explicitement l'insolation et les sun-hours; l'entrée reste réelle/provenancée. | inventer une journée type, déduire la météo depuis la localité, ou prendre la moyenne annuelle. |
| `DEC-AIO-003` | Séparer énergie utile de stockage et capacité nominale; ne calculer Ah que pour plomb déclaré. | Évite d'appliquer une formule plomb à lithium ou à une batterie non spécifiée. | transformer silencieusement efficacité round-trip en rendement de décharge. |
| `DEC-AIO-004` | L'onduleur est dimensionné comme exigence de puissance de charge, non comme équipement. | IEEE 1562 ne couvre pas le dimensionnement onduleur et le choix est `EQP-001`. | `max(PV × rendement, max(load))` de l'historique, sans justification. |
| `DEC-AIO-005` | Les comparaisons legacy sont informatives, jamais golden. | Le legacy contient défauts connus et defaults implicites. | copier les sorties Python comme baseline. |

## Audit des candidats historiques

**Bilan des 11 candidats audités**: `retain: 0`, `correct: 3`, `delete: 7`, `unresolved: 1`. Les sept règles du nouveau registre ne sont pas un portage : elles constituent le contrat AIO v1, justifié par les sources ci-dessus.

| ID | Emplacement historique / usage UI | Entrées → sortie / unités | Hypothèses, bornes, défaut | Décision |
|---|---|---|---|---|
| `LEG-001` | `new_optimization_service.py:132 computePvPower`; résultats présizing | `Ext/(PR×Ir) → Pc`; unités `Ext` et `Ir` non documentées | zéro/ratio non contrôlés, orientation/météo non traçables | **correct** → `CALC-AIO-004`; Wh/j ÷ (h/j × ratio) = W STC |
| `LEG-002` | `:144 computeBatteryCapacity`; affichage `cbatMin` | `St×1000/(vBat×dod) → Ah` | `nc` ignoré malgré signature; `St` ambigu; chimie non déclarée | **correct** → `CALC-AIO-006`, plomb seulement; rendement batterie séparé |
| `LEG-003` | `:162 computeExergyNeed` | mélange `alphaA`, `alphaN`, `ns`, `nc`, `Et`, `yEn` → `Ext` | sémantique non prouvée, unités non définies | **unresolved**; ne pas implémenter |
| `LEG-004` | `:177/:187/:193` banques stockage | `Et`, alpha, rendements → `St` | formules concurrentes commentées, aucune source indépendante reliée | **delete** du périmètre AIO; remplacé par besoin d'autonomie explicite |
| `LEG-005` | `new_presizing_service.py:31-77` | paramètres projet → inputs | defaults implicites `PR=70%`, onduleur/batterie `90%`, `48V`, DoD `80%`, coûts/vies | **delete**; inconnu reste inconnu |
| `LEG-006` | `presizingResults:127-205` | balayage α + résultats | mélange dimensionnement, LPSP/SRI, LCOE/SVI, CO₂ et équipement | **delete** d'AIO; dispatch SIM/EQP/FIN |
| `LEG-007` | `computeLPSP:377+` | profil, TMY, SOC, géographie → LPSP | simulation 8760 h; fallback observé lors de météo absente | **delete** d'AIO → `SIM-001` |
| `LEG-008` | `computeLOLP:241`, `computeSRI:291` | heures déficit/LPSP → ratios | dépend d'une simulation; total 8760 figé | **delete** d'AIO → `SIM-001` |
| `LEG-009` | `computeLCC/LCOE/SVI`, `:199` | coûts, vies, taux → monnaie/ratio | `computeLCOE` force `degradation=0` | **delete** → `FIN-001` |
| `LEG-010` | `presizingResults:151-155` | Pc/cBat/catalogue → nombres d'unités | division sans arrondi/compatibilité cataloguée | **delete** → `EQP-001` |
| `LEG-011` | données UI `projectInputs.ts` | appareils, points horaires, facture | types existent, provenance/méthode de conversion absentes; `batteryEfficiencyRatio` ambigu | **correct** par adaptateur externe, sans modifier l'UI dans cette feature |

## Matrice exigence → règle → résultat → test

| Exigence | Entrée canonique | Règle / unité | Source | Résultat | Test exigé |
|---|---|---|---|---|---|
| FR-002 | `hourlyEnergyWh[24]` | `E_ac_day_Wh = ΣE_i`; `P_peak_W = max(E_i / 1h)` | `SRC-AIO-003` | énergie/pic AC | unit, frontière, propriété conservation |
| FR-003 | `E_ac_day_Wh`, `inverterEfficiencyRatio` | `E_dc_day_Wh = E_ac_day_Wh / η_inv` | `SRC-AIO-002` | énergie DC | unit, η=1, monotonicité |
| FR-004 | `E_dc_day_Wh`, `designPsh_hPerDay`, `pvPerformanceRatio` | `P_pv_stc_W = E_dc_day_Wh/(PSH×PR)` | `SRC-AIO-001`, `SRC-AIO-002` | puissance PV STC minimale | unit, zéro/interdit, sensibilité |
| FR-005 | `E_dc_day_Wh`, `autonomyDays` | `E_storage_usable_Wh = E_dc_day_Wh×N_days` | `SRC-AIO-002`, `SRC-AIO-004` | énergie utile stockage | unit, N=0, monotonicité |
| FR-005 | énergie utile, DoD, rendement décharge, tension | `E_nominal_Wh = E_usable/(DoD×η_discharge)`; `C_Ah = E_nominal_Wh/V_nominal` | `SRC-AIO-001`, `SRC-AIO-005` | capacité plomb nominale | unit, bornes, golden revu |
| FR-006 | `hourlyEnergyWh`, `startupPowerMultiplier` | `P_inv_cont_W=P_peak_W`; `P_inv_surge_W=max(P_start_i + ΣP_running_others)` | `SRC-AIO-004` (contrainte step load) | exigences onduleur | branches inductives, multiplicateurs manquants |

## Règles normatives candidates

### CALC-AIO-001 — Agrégation énergétique

`E_ac_day_Wh = Σ_{h=0..23} hourlyEnergyWh[h]` et `P_peak_coincident_W = max(hourlyEnergyWh[h] / 1 h)`.

- Entrées: 24 Wh finies, chacune ≥ 0; sortie Wh et W.
- Hypothèse: chaque case représente une énergie moyenne sur une heure de la même journée-type.
- Avertissement: ce pic est une puissance horaire moyenne, pas un transitoire sous-horaire.
- Arrondi: aucun dans le moteur; affichage ultérieur seulement.

### CALC-AIO-002 — Besoin DC

`E_dc_day_Wh = E_ac_day_Wh / inverterEfficiencyRatio` pour les charges AC. La charge DC éventuelle est ajoutée séparément sans repasser par l'onduleur.

- `0 < η_inv ≤ 1`; sortie bloquée si l'efficacité n'est pas explicitement déclarée.

### CALC-AIO-003 — Heures solaires de conception

`PSH_hPerDay = H_poa_kWhPerM2PerDay / 1 kWPerM2`.

- `H_poa` est une irradiation réellement fournie sur le plan de l'array pour le mois/période de conception; `PSH > 0`.
- Le choix du mois critique est une hypothèse de projet tracée, non une sélection automagique par l'AIO.

### CALC-AIO-004 — Puissance PV STC

`P_pv_stc_W = E_dc_day_Wh / (PSH_hPerDay × pvPerformanceRatio)`.

- `0 < PR ≤ 1`; le PR est une hypothèse déclarée, ne doit pas être une constante cachée.
- Sortie analytique non garantie; la validation de l'énergie livrée appartient à `SIM-001`.

### CALC-AIO-005 — Énergie de stockage utilisable

`E_storage_usable_Wh = E_dc_day_Wh × autonomyDays`.

- `autonomyDays ≥ 0`, explicitement choisi et sourcé dans l'étude.
- Elle ne prétend pas représenter la fiabilité météorologique; elle exprime seulement le besoin d'autonomie déclaré.

### CALC-AIO-006 — Capacité plomb nominale

`E_storage_nominal_Wh = E_storage_usable_Wh / (depthOfDischargeRatio × batteryDischargeEfficiencyRatio)` puis `C_battery_nominal_Ah = E_storage_nominal_Wh / batteryNominalVoltageV`.

- Seulement `batteryChemistry = lead-acid`; `0 < DoD, η_discharge ≤ 1`, `V > 0`.
- L'AIO peut produire `E_storage_usable_Wh` pour une autre chimie, mais bloque les sorties nominales/Ah.

### CALC-AIO-007 — Pic et démarrage onduleur

`P_inverter_continuous_ac_W = P_peak_coincident_W`. Pour chaque charge inductive, `P_start_i_W = P_running_i_W × startupPowerMultiplier`; le pic de démarrage est le maximum de la charge qui démarre plus les autres charges simultanées de son intervalle.

- Si `isInductive=true` et multiplicateur absent, la sortie surge est bloquée, sans hypothèse `×3` ou autre.

## Décisions humaines restantes

Aucune décision humaine ne bloque la rédaction ou l'implémentation de ce noyau. Les choix suivants sont déjà encodés comme entrées obligatoires du projet, non comme décisions à prendre par Terra : valeur de PR, autonomie, DoD, rendement de décharge, mois de conception, ressource solaire et profil d'une facture. Toute demande d'ajouter une chimie batterie ou de changer un golden exige l'approbation humaine prescrite par la Constitution.
