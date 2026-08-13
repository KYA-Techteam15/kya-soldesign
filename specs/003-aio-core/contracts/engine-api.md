# Contrat public du moteur AIO

## Surface proposée

```ts
export interface AioSizingEngineV1 extends CalculationEngine<AioSizingRequestV1, AioSizingOutputV1> {}

export interface AioSizingEnvelopeV1 extends CalculationEnvelope<AioSizingOutputV1> {
  contractVersion: 1;
  provenance: readonly ProvenanceRecordV1[];
  warnings: readonly EngineWarningV1[];
  violatedConstraints: readonly ConstraintViolationV1[];
  trace: readonly FormulaTraceV1[];
}
```

## Règles d'API

1. Le contrat DATA-001 existant `CalculationEngine.calculate` reste strictement inchangé et asynchrone. `AioSizingEngineV1` le spécialise et ajoute `calculateSync`, qui porte le calcul pur, synchrone, déterministe et sans effets de bord; `calculate` délègue à ce même cœur sans modifier les formules. Un Worker peut l'héberger sans changer ces contrats.
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
| `AIO_INVALID_STARTUP_EVENT` | puissance surge seulement |
| `AIO_INVALID_TECHNICAL_CONTEXT` | aucune sortie quantitative si le champ n'est utilisé par aucune formule; la contrainte reste exposée |
| `AIO_INVALID_PROVENANCE` | toutes les sorties, car aucune valeur publique ne peut être disponible sans provenance valide |
| `AIO_INVALID_REQUEST_SHAPE` | toutes les sorties lorsqu'aucune récupération typée par dépendance n'est possible |

`AIO_INVALID_HOURLY_SERIES` ne doit jamais servir de code générique. Il bloque l'énergie AC, le pic, le besoin DC, le PV, le stockage et les puissances onduleur, mais laisse `designPeakSunHoursHPerDay` disponible lorsque la ressource solaire est valide. Une erreur de démarrage ne bloque que la puissance surge. Une erreur de ressource solaire ne bloque que PSH/PV. Une hypothèse invalide est traitée comme absente et ne bloque que ses descendants. Les coordonnées ou le type d'application invalides, non utilisés par les formules AIO v1, produisent une contrainte sans rendre indisponibles des sorties indépendantes.

Pour une entrée qui ne satisfait pas le contrat JSON canonique (`NaN`, `Infinity`, propriété non sérialisable), le moteur retourne encore une enveloppe déterministe et ne lève pas d'exception métier. Son `inputHash` doit être un identifiant diagnostique stable avec un préfixe distinct de celui d'une entrée canonique valide; il ne doit jamais être présenté comme le hash d'une requête technique validée.

## Compatibilité avec les contrats existants

- Réutiliser les unités brandées de `packages/domain` lorsque compatibles; ajouter les marques ratio, Ah, irradiance et jours au même endroit plutôt que de dupliquer les primitives.
- Étendre `CalculationEnvelope` et `CalculationTraceEntry` existants, ne pas les reconstruire. Toute évolution de format public hors de cette spécialisation exige une approbation explicite.
- Les adaptateurs depuis `apps/desktop/src/app/models/projectInputs.ts` vivent hors moteur et sont testés. Ils ne peuvent pas changer une valeur nullable en défaut.
- Aucun import de `apps/desktop`, des dossiers parents ou du legacy depuis `packages/engine`.
