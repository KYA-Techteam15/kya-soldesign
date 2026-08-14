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

## Règles Page 1 retenues

1. Appareil : le champ visible devient explicitement `P_unit_useful_W`; `P_called_W = P_unit_useful_W × quantity × simultaneityRatio / efficiencyRatio`. Aucun ratio implicite; une ligne incomplète est bloquée.
2. La puissance électrique de plaque peut être saisie sans inflation en déclarant une efficacité de `1`; l'interface ne la choisit pas pour l'utilisateur.
3. Heure `h` : `E_h_Wh = Σ(P_called_i_W × operatingFraction_i,h × 1 h)`.
4. Énergie quotidienne : `Σ E_h`; pic horaire moyen : `max(E_h / 1 h)`; ces deux résultats sont `CALC-AIO-001`.
5. Démarrage : l'événement de chaque nouveau bloc fournit `runningPowerW` et `startupPowerMultiplier` à `CALC-AIO-007`; aucun coefficient par défaut.
6. Facture : `dailyEnergyWh = observedEnergyWh / observedDays`, puis répartition par les 24 fractions d'un profil sourcé; règle déjà exportée par `normalizeMeterEstimateToAioDailyLoad`.

## Défauts de l'implémentation active

- Le runtime servi est `main.tsx → App.tsx → routes/workshop`. Les fichiers `features/workshop/steps/*` sont un stack parallèle non routé et ne doivent pas être modifiés pour corriger l'écran visible.
- `SectionSite.tsx` conserve le design validé mais remet la météo à zéro et ne permet pas encore de fournir une vraie série mensuelle sourcée.
- `SectionBesoins.tsx` conserve les trois modes et les tableaux, mais les colonnes calculées, l'ajustement des heures et le port réel restent indisponibles.
- Le modèle projet ne stocke pas encore les 24 fractions par appareil ni une ressource solaire mensuelle avec provenance.
- Les localités du snapshot ont un fuseau `null`; l'adaptateur ne doit pas inventer `Africa/Lome`.

## Décisions bloquantes évitées

Les grandeurs absentes restent absentes. Le goal n'approuve ni rendement/simultanéité d'appareil implicites, ni tension réseau universelle, ni profil facture générique, ni fuseau par défaut, ni données PVGIS simulées.
