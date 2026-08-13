# Contrat public du moteur AIO

## Surface proposée

```ts
export interface AioSizingEngineV1 {
  calculate(request: AioSizingRequestV1): AioSizingEnvelopeV1;
}

export interface AioSizingEnvelopeV1 {
  contractVersion: 1;
  engineVersion: string;
  inputHash: string;
  provenance: readonly ProvenanceRecordV1[];
  output: AioSizingOutputV1;
  warnings: readonly EngineWarningV1[];
  violatedConstraints: readonly ConstraintViolationV1[];
  trace: readonly FormulaTraceV1[];
}
```

## Règles d'API

1. `calculate` est synchrone, pur, déterministe et sans effets de bord. Un Worker peut l'héberger sans changer le contrat.
2. Le hash porte sur la représentation canonique technique, triée de manière stable, après validation et conversion des unités; aucun champ administratif, date d'exécution, locale ou secret ne le modifie.
3. Une validation de frontière échoue avec des contraintes sérialisables; le moteur ne lève pas une exception non structurée pour une erreur métier attendue.
4. L'absence d'une dépendance donne `blocked`, jamais `0`, `null` ambigu ou une constante cachée.
5. Les nombres canoniques restent non arrondis. La présentation UI applique seulement son formatage après réception de l'enveloppe.
6. `engineVersion` est injectée à la construction/version du package, jamais lue depuis l'environnement à l'exécution.
7. Les identifiants `formulaId` et `sourceIds` doivent exister dans `calculation-register.md`.

## Codes minimums de contraintes

| Code | Bloque |
|---|---|
| `AIO_INVALID_HOURLY_SERIES` | énergie, pic et descendants |
| `AIO_MISSING_SOLAR_RESOURCE` | PSH et PV |
| `AIO_INVALID_SOLAR_RESOURCE` | PSH et PV |
| `AIO_MISSING_INVERTER_EFFICIENCY` | DC, PV, stockage |
| `AIO_MISSING_PV_PERFORMANCE_RATIO` | PV |
| `AIO_MISSING_AUTONOMY_DAYS` | stockage |
| `AIO_UNSUPPORTED_BATTERY_CHEMISTRY` | nominale/Ah seulement |
| `AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION` | nominale/Ah seulement |
| `AIO_MISSING_STARTUP_MULTIPLIER` | puissance surge seulement |
| `AIO_METER_PROFILE_UNSOURCED` | série/pic/onduleur; énergie agrégée peut rester disponible |

## Compatibilité avec les contrats existants

- Réutiliser les unités brandées de `packages/domain` lorsque compatibles; ajouter les marques ratio, Ah, irradiance et jours au même endroit plutôt que de dupliquer les primitives.
- Conserver `CalculationEnvelope` générique intact pour les features existantes. AIO introduit son enveloppe complète et un adaptateur explicite seulement si une évolution de format public est approuvée.
- Les adaptateurs depuis `apps/desktop/src/app/models/projectInputs.ts` vivent hors moteur et sont testés. Ils ne peuvent pas changer une valeur nullable en défaut.
- Aucun import de `apps/desktop`, des dossiers parents ou du legacy depuis `packages/engine`.
