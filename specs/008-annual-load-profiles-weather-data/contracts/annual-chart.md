# Contract — Visualisation annuelle multi-fréquence

## Principe

La série horaire annuelle est l’unique source. Plage, fréquence, séries visibles,
zoom et réduction de rendu sont des paramètres de présentation et ne modifient
ni le projet, ni le YEn, ni le hash d’entrée scientifique.

## Plages

- `year` : année complète ;
- `period` : période configurée ;
- `month` : mois civil ;
- `week` : sept jours à partir d’une date locale ;
- `day` : une date locale ;
- `custom-range` : bornes locales inclusives validées.

## Fréquences

- `auto` : année/période → jour ; mois → jour ; semaine/jour → heure ;
- `hourly` : pas horaires sources ;
- `daily` : un bucket par date locale ;
- `weekly` : semaines locales documentées ;
- `monthly` : mois civils locaux.

Une fréquence incompatible avec une plage courte peut rester autorisée si elle
produit au moins un bucket ; l’interface explique la fréquence résolue.

## Agrégations

Pour chaque bucket :

```text
energyWh       = Σ hourlyEnergyWh
averagePowerW  = energyWh / totalDurationHours
peakPowerW     = max(hourlyPeakPowerW)
meanPoaWm2     = moyenne pondérée par durée des POA disponibles
```

Le fuseau du projet détermine les limites jour/semaine/mois. Aucun arrondi n’est
appliqué avant la présentation.

## Année horaire et performance

L’année horaire utilise une courbe continue, zoom/pan ou sélection de plage. Une
réduction purement graphique MAY être appliquée par pixel/bucket si elle conserve
premier, dernier, minimum et maximum. Cette réduction :

- ne remplace jamais les points horaires en mémoire ;
- n’alimente jamais calcul, infobulle précise ou export ;
- ne masque pas une pointe rare ;
- est déterministe et testée.

## Séries et infobulle

L’utilisateur peut afficher charge moyenne, pointe, énergie et POA. L’infobulle
horaire ou journalière nomme au minimum date/intervalle, période, type de jour,
profil appliqué, valeur et unité. Les axes incompatibles sont séparés ou
explicitement identifiés ; la couleur seule ne porte pas la distinction.

## Export

L’export contient la plage, la fréquence résolue, le fuseau, les unités, les
règles d’agrégation et les valeurs avant formatage. Il doit être reproductible à
partir de la série horaire et de `AnnualChartQueryV1`.

## États

- `ready` : graphe et export disponibles ;
- `stale` : ancien résultat visible comme obsolète, export désactivé ;
- `blocked` : calendrier/profil/météo incomplet nommé ;
- `empty` : énergie nulle représentée comme donnée valide, YEn indisponible ;
- `loading` : conservation de la plage demandée sans faux tracé.

