# Modèle de données Page 1

## Autorité éditable

`ProjectFileV1.inputs` est validé comme `ProjectInputsV1`. Les extensions restent dans `apps/desktop` tant qu'aucune persistance publique n'est approuvée; toute évolution publique de `@ksd/project-format` exige une migration explicite.

## Site

Étendre `inputs.site` avec :

- `timezoneIana: string | null` — explicitement choisi/obtenu d'une source;
- `solarResource: SolarResourceInputV1 | null`.

`SolarResourceInputV1` contient : 12 valeurs mensuelles POA positives ou nulles, orientation de calcul, période/dataset, fournisseur, locator, date de récupération, drapeaux qualité et provenance canonique. `designMonth` est un champ utilisateur séparé `1..12 | null`.

La ressource est fraîche uniquement si son orientation et sa source correspondent aux champs courants. Une ressource périmée reste visible comme preuve antérieure mais n'alimente pas AIO.

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
