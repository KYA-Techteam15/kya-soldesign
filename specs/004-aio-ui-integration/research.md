# Recherche et audit des formules — Page 1

## Principe

Le Python historique décrit des comportements à examiner, pas des formules à copier. Les normalisateurs déjà convergés dans `packages/domain/src/aio.ts` sont l'autorité de sortie vers AIO.

## Registre historique

| ID | Comportement historique | Analyse | Décision |
|---|---|---|---|
| `LEG-P1-001` | `P_total = quantité × puissance_unitaire` | définition arithmétique cohérente si l'unité est W | retenir avec unités explicites |
| `LEG-P1-002` | `P_réelle = P_total / rendement` | cohérent uniquement si le champ est explicitement une puissance utile; zéro devenait silencieusement zéro | clarifier le libellé en puissance utile et exiger un rendement valide, sinon bloquer la ligne |
| `LEG-P1-003` | `E = P_réelle × heures` | correct pour puissance constante et heures/fractions déclarées | retenir sous forme `Σ(P_h × 1 h)` pour conserver la temporalité |
| `LEG-P1-004` | démarrage inductif au premier intervalle d'un bloc | utile; le code ne traite pas explicitement la continuité circulaire 23 h → 0 h et indexe les charges par nom mutable | corriger avec ID stable et règle circulaire documentée |
| `LEG-P1-005` | profil direct : `peak = max(real, peak)` | invariant nécessaire | retenir dans le schéma/normalisateur, sans mutation silencieuse : erreur de champ ou correction explicitement signalée |
| `LEG-P1-006` | facture : `dailyWh = monthlyKWh × 1000 / 30` | faux pour les périodes de 28, 29 ou 31 jours et pour une facture non mensuelle | supprimer; exiger énergie observée + nombre exact de jours |
| `LEG-P1-007` | profil facture conventionnel puis clip/redistribution selon puissance compteur | estimation plausible mais formes et tensions figées sans provenance scientifique | ne retenir que via un `NormalizedHourlyProfile` sourcé; la capacité compteur devient diagnostic, pas redistributrice cachée |
| `LEG-P1-008` | pointe facture identique à la puissance moyenne | ne démontre aucun transitoire | conserver `startupEvents=[]` et avertir que la pointe transitoire est inconnue |
| `LEG-P1-009` | `yEn = énergie pendant Ir ≥ Ir_min / énergie totale`, arrondi à 2 décimales | dépend d'une série d'irradiance horaire et appartient à la simulation; l'absence devenait `0` | reporter à `SIM-001`; inconnu n'est pas zéro |
| `LEG-P1-010` | irradiation journalière = somme des 24 irradiances horaires / 1000 | correct seulement pour pas exact d'une heure en W/m² et données POA alignées | l'import météo doit déclarer intervalle, convention temporelle et orientation |

## Registre météo et couplage Page 1

| ID | Formule / source | Unités et applicabilité | Décision |
|---|---|---|---|
| `DATA-P1-001` | PVGIS 5.3 TMY JSON, JRC API `tmy`, ISO 15927-4 | 8 760 pas horaires; GHI, DNI, DHI en W/m²; température en °C | conserver le JSON source, son endpoint/version et son SHA-256; normaliser sur une année civile non bissextile sans modifier mois/jour/heure |
| `CALC-P1-008` | NOAA General Solar Position Calculations | latitude/longitude en degrés; heure UTC; azimut horaire depuis le nord | porter en TypeScript pur; aucune heure solaire locale inventée |
| `CALC-P1-009` | Klucher 1979 tel qu'exposé par pvlib | GHI/DNI/DHI/POA en W/m², tilt/azimut en degrés, albédo ratio `[0,1]` | reproduire direct + diffuse Klucher + réflexion sol; comparer à pvlib sur fixture réelle |
| `CALC-P1-010` | agrégation `ksd_app.SolarAnalysisService` corrigée | kWh/m²/j et W/m²; intervalle exact 60 min | calculer mensuelles et profils 24 h depuis les 8 760 POA, sans découpage approximatif |
| `CALC-P1-011` | `ksd_app.simulation_helper.computeYEn` corrigé | énergie horaire Wh, seuil POA W/m², ratio `[0,1]` | conserver la définition, supprimer l'arrondi interne et représenter l'absence par indisponible |
| `ASSUMP-P1-001` | albédo générique sol/herbe courte utilisé par la transposition de référence | ratio `0,20`, non mesuré | conserver comme hypothèse visible et traçable pour cette tranche; ne pas réutiliser le `0,30` divergent de l'ancien simulateur |

Sources normatives : documentation API PVGIS 5.3 du Joint Research Centre; NOAA GML `solareqns.PDF`; Klucher, Solar Energy 23(2), 1979; implémentation pvlib utilisée uniquement comme comparaison indépendante.

### Comparaison indépendante `pvlib` — Bombouaka

La fixture complète a été évaluée avec `pvlib 0.13.1`, `Location.get_solarposition` (SPA) et `get_total_irradiance(model="klucher", albedo=0.2)`, puis comparée au port TypeScript NOAA + Klucher. Référence annuelle : `2 246,317350755 kWh/m²`; référence mensuelle : `[5,9312; 7,5298; 7,0326; 6,5727; 6,1132; 5,7866; 4,8169; 4,5447; 5,6806; 5,9820; 6,9650; 7,0419] kWh/m²/j`. L'acceptation automatique impose moins de `0,05 kWh/m²/j` d'écart par mois et moins de `0,5 kWh/m²/an` sur l'annuel. Cet oracle contrôle la transposition; il ne remplace ni PVGIS comme source météo ni les formules documentées comme autorité.

## Règles Page 1 retenues

1. Appareil : le champ visible devient explicitement `P_unit_useful_W`; `P_called_W = P_unit_useful_W × quantity × simultaneityRatio / efficiencyRatio`. Aucun ratio implicite; une ligne incomplète est bloquée.
2. La puissance électrique de plaque peut être saisie sans inflation en déclarant une efficacité de `1`; l'interface ne la choisit pas pour l'utilisateur.
3. Heure `h` : `E_h_Wh = Σ(P_called_i_W × operatingFraction_i,h × 1 h)`.
4. Énergie quotidienne : `Σ E_h`; pic horaire moyen : `max(E_h / 1 h)`; ces deux résultats sont `CALC-AIO-001`.
5. Démarrage : l'événement de chaque nouveau bloc fournit `runningPowerW` et `startupPowerMultiplier` à `CALC-AIO-007`; aucun coefficient par défaut.
6. Facture : `dailyEnergyWh = observedEnergyWh / observedDays`, puis répartition par les 24 fractions d'un profil sourcé; règle déjà exportée par `normalizeMeterEstimateToAioDailyLoad`.

## Défauts restant après la phase moteur

- Le runtime servi est `main.tsx → App.tsx → routes/workshop`. Les fichiers `features/workshop/steps/*` sont un stack parallèle non routé et ne doivent pas être modifiés pour corriger l'écran visible.
- `SectionSite.tsx` doit encore consommer la nouvelle capacité solaire et restaurer le dialogue/les graphes du design validé.
- `SectionBesoins.tsx` conserve les trois modes et l'ajustement des heures, mais doit encore tracer charge moyenne, pointe et POA réelles.
- L'import/téléchargement doit encore convertir le JSON strict vers le payload projet avant de l'enregistrer.
- Les autres localités restent sans fuseau et sans météo, donc ne peuvent pas devenir calculables par simple sélection.

## Décisions bloquantes évitées

Les grandeurs absentes restent absentes. Le goal n'approuve ni rendement/simultanéité d'appareil implicites, ni tension réseau universelle, ni profil facture générique, ni fuseau par défaut, ni données PVGIS simulées.

La première ressource embarquée est le fichier PVGIS-SARAH3 Bombouaka téléchargé via l'API 5.3 pour `10.7030, 0.2099`, période déclarée par la réponse `2005–2023`. Les anciens enregistrements météo dépourvus de fichier sont supprimés du catalogue accepté.

Bombouaka utilise le fuseau IANA `Africa/Lome`, explicitement associé à la ressource/localité; aucun mapping général pays → fuseau n'est inventé, car plusieurs pays couvrent plusieurs zones.
