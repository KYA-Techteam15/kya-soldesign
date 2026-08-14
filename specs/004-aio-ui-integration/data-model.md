# Modèle de données Page 1

## Autorité éditable

`ProjectFileV1.inputs` est validé comme `ProjectInputsV1`. Les extensions restent dans `apps/desktop` tant qu'aucune persistance publique n'est approuvée; toute évolution publique de `@ksd/project-format` exige une migration explicite.

## Site

Étendre `inputs.site` avec :

- `timezoneIana: string | null` — explicitement choisi/obtenu d'une source;
- `solarResource: SolarResourceInputV1 | null`.

`SolarResourceInputV1` contient : 12 valeurs mensuelles POA positives ou nulles, orientation de calcul, période/dataset, fournisseur, locator, date de récupération, drapeaux qualité et provenance canonique. `designMonth` est un champ utilisateur séparé `1..12 | null`.

La ressource contient aussi la `WeatherSeries` canonique ayant produit ces valeurs, son identifiant de fichier/source, 8 760 POA horaires dérivées et les 24 profils moyens annuel/mensuels. Ces données sont sérialisables et autoportantes avant la persistance Tauri. Le JSON PVGIS brut reste dans le catalogue ou est fourni par l'utilisateur; le projet ne conserve jamais une référence vers le parent.

La ressource est fraîche uniquement si son orientation et sa source correspondent aux champs courants. Une ressource périmée reste visible comme preuve antérieure mais n'alimente pas AIO.

## Analyse météo

`WeatherAnalysisV1` contient : orientation, albédo, `hourlyPoaIrradianceWPerM2[8760]`, `monthlyDailyPoaKWhPerM2[12]`, `annualMeanHourlyPoaWPerM2[24]`, `monthlyMeanHourlyPoaWPerM2[12][24]`, recommandation d'orientation et provenance de calcul. Toute longueur, valeur négative/non finie ou association source/localité invalide bloque l'analyse.

## Profils de charge

Chaque profil conserve les trois brouillons, mais `source` choisit l'unique autorité :

- `equipment` : `items[]` + `hourlyOperatingFractions[24]` par item;
- `hourly` : `hourlyPoints[24]`;
- `meter` : énergie observée, période exacte et `normalizedProfileId`.

Les `hourlyPoints` d'un profil `equipment` sont une projection calculée et ne doivent pas être réenregistrés comme seconde vérité. Pour `meter`, la série dérivée appartient à l'enveloppe de normalisation, pas aux entrées.

## États calculés

Le projet ne stocke pas les valeurs AIO dans `inputs`. Le port retourne un état `empty | loading | error | stale | ready`; `ready` contient uniquement l'enveloppe immuable. `inputHash` et la révision technique permettent de détecter `stale`.

## Zéro, null et invalide

- zéro : valeur connue nulle;
- null/absence : valeur inconnue;
- invalide : saisie conservée dans l'état de formulaire, jamais transmise au projet validé;
- une ligne incomplète bloque sa normalisation avec un problème par champ; elle n'est pas ignorée silencieusement.
