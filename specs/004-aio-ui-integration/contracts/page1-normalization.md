# Contrat — Normalisation des besoins Page 1

## API pure

Créer une façade pure dans `packages/engine/src/load-profile/` qui accepte un brouillon validé du mode actif et retourne :

```ts
type Page1LoadNormalization =
  | { status: 'ready'; load: CanonicalDailyLoadV1; warnings: readonly LoadWarning[] }
  | { status: 'blocked'; issues: readonly LoadInputIssue[] };
```

Elle compose les fonctions existantes :

- `normalizeEquipmentScheduleToAioDailyLoad`;
- `normalizeDirectHourlyPowerToAioDailyLoad`;
- `normalizeMeterEstimateToAioDailyLoad`.

## Invariants

- exactement 24 intervalles de 60 minutes;
- W × 1 h devient Wh sans facteur caché;
- conservation de l'énergie à `1e-9` dans le cœur;
- `peakPowerW >= activePowerW` pour le mode direct;
- les items sont identifiés par ID stable, jamais par nom;
- une charge inductive sans multiplicateur `>1` bloque seulement la sortie surge AIO;
- une facture exige `observedDays > 0` entier et un profil sourcé;
- aucune normalisation ne dépend de React, du réseau, de l'horloge ou du locale.

Pour le mode appareils, `activePowerW` transmis au contrat DATA/AIO est la puissance électrique appelée dérivée de la puissance utile explicitement libellée : `P_called = P_unit_useful × quantity × simultaneity / efficiency`. Le `LoadItem` canonique reçoit `quantity=1` et `simultaneityRatio=1` après cette conversion de frontière afin de ne pas appliquer deux fois les facteurs; les valeurs d'origine restent dans le projet et la trace de normalisation.

## Démarrages

Un démarrage existe lorsque la fraction courante est positive et que la fraction précédente est nulle. Le précédent de l'heure 0 est l'heure 23, afin qu'un fonctionnement continu à minuit ne crée pas un faux démarrage.
