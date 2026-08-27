# Data Model — Finalisation de l’expérience applicative

## Principes

- Toute donnée persistée possède une version et un parseur strict.
- Les brouillons de formulaire ne sont pas des réglages validés.
- Une inconnue reste `null` ou un état discriminé ; elle ne devient pas zéro.
- Les projets existants ne sont jamais recalculés ou modifiés par une migration de réglages.
- Les fichiers binaires ne sont pas stockés dans localStorage.
- La profondeur de décharge n’appartient pas aux réglages globaux.

## ApplicationSettingsV2

```ts
interface ApplicationSettingsV2 {
  readonly version: 2;
  readonly company: CompanySettings;
  readonly defaults: ProjectDefaults;
  readonly reports: ReportSettings;
  readonly projects: ProjectExperienceSettings;
  readonly currency: CurrencySettings;
  readonly updatedAtIso: string;
}
```

### CompanySettings

```ts
interface CompanySettings {
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly email: string;
}
```

Règles : nom non vide après trim ; e-mail vide ou valide ; limites explicites
sur la longueur ; aucune interprétation HTML.

### ProjectDefaults

```ts
interface ProjectDefaults {
  readonly reliability: {
    readonly performanceRatioPercent: number;
    readonly maxLpspPercent: number;
    readonly maxLolpPercent: number;
  };
  readonly conversion: {
    readonly inverterEfficiencyPercent: number;
    readonly batteryEfficiencyPercent: number;
    readonly batteryNominalVoltageV: number;
  };
  readonly equipmentCosts: {
    readonly currencyCode: string;
    readonly pvSpecificMinorPerKwc: bigint | string;
    readonly batterySpecificMinorPerKwh: bigint | string;
    readonly inverterSpecificMinorPerKw: bigint | string;
    readonly pvMarginPercent: number;
    readonly batteryMarginPercent: number;
    readonly inverterMarginPercent: number;
  };
  readonly commercial: {
    readonly vatPercent: number;
    readonly offerValidityDays: number;
    readonly warrantyMonths: number;
    readonly deliveryDays: number;
    readonly discountPercent: number;
    readonly downPaymentPercent: number;
  };
}
```

Les montants persistés peuvent être sérialisés en chaînes d’entiers d’unités
mineures. Le type concret est figé dans le contrat TypeScript avant implémentation.
`batteryDod` et `batteryDodPercent` sont explicitement absents.

### ReportSettings

```ts
interface ReportSettings {
  readonly logoAssetId: string | null;
  readonly signatureAssetId: string | null;
  readonly signatureText: string;
  readonly footerText: string;
}
```

### ProjectExperienceSettings

```ts
interface ProjectExperienceSettings {
  readonly recentProjectLimit: number; // 1..12
  readonly autosave: {
    readonly strategy: 'immediate' | 'debounced';
    readonly debounceMs: number; // utilisé uniquement si debounced
  };
  readonly exportDestination: {
    readonly mode: 'ask-each-time' | 'platform-handle';
    readonly handleId: string | null;
  };
}
```

Un navigateur sans capacité de handle permanent normalise toujours le mode vers
`ask-each-time`.

### CurrencySettings

```ts
interface CurrencySettings {
  readonly inputCurrencyCode: string;
  readonly outputCurrencyCode: string;
  readonly rate: ExchangeRateRecord | null;
}

interface ExchangeRateRecord {
  readonly baseCurrencyCode: string;
  readonly quoteCurrencyCode: string;
  readonly decimalRate: string;
  readonly mode: 'manual' | 'remote';
  readonly sourceLabel: string;
  readonly sourceLocator: string | null;
  readonly observedAtIso: string;
  readonly fetchedAtIso: string | null;
}
```

`decimalRate` est une chaîne décimale positive normalisée. La conversion utilise
une bibliothèque ou primitive décimale approuvée, jamais une accumulation de
`number` flottants.

## UiPreferencesV1

Le contrat existant reste séparé :

```ts
interface UiPreferencesV1 {
  readonly theme: 'light' | 'dark';
  readonly vibe: 'sober' | 'vivid' | 'radiant';
  readonly lang: 'fr' | 'en';
}
```

La route Réglages présente cette entité dans la catégorie Interface mais ne la
duplique pas dans `ApplicationSettingsV2`.

## SettingsDraft

```ts
type FieldDraft = {
  readonly raw: string;
  readonly touched: boolean;
  readonly errorKey: string | null;
};
```

Un `SettingsDraft` contient les chaînes en cours de saisie. Seul un résultat de
validation complet peut produire un patch de `ApplicationSettingsV2`.

## SettingsMigrationResult

```ts
type SettingsMigrationResult =
  | { readonly status: 'not-needed'; readonly settings: ApplicationSettingsV2 }
  | { readonly status: 'migrated'; readonly settings: ApplicationSettingsV2; readonly ignoredKeys: readonly string[] }
  | { readonly status: 'failed'; readonly code: string; readonly recoverableRaw: string | null };
```

### Mapping V1 → V2

| V1 | V2 |
|---|---|
| companyName/address/phone/email | company.* |
| reportLogo | migration vers asset si récupérable, sinon fallback et avertissement |
| reportFooter | reports.footerText |
| performanceRatioPercent, maxLpspPercent, maxLolpPercent | defaults.reliability.* |
| inverterEfficiencyPercent, batteryEfficiencyPercent, batteryVoltage | defaults.conversion.* |
| coûts et marges | defaults.equipmentCosts.* |
| TVA, validité, garantie, délai, remise, acompte | defaults.commercial.* |
| currencyCode | inputCurrencyCode et outputCurrencyCode initiaux |
| batteryDodPercent | ignoré, inscrit dans `ignoredKeys` |

## ReportAsset

```ts
interface ReportAsset {
  readonly id: string;
  readonly kind: 'logo' | 'signature';
  readonly filename: string;
  readonly mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  readonly byteLength: number;
  readonly sha256: string;
  readonly createdAtIso: string;
  readonly sanitized: boolean;
  readonly blob: Blob;
}
```

Transitions : `selected → validating → stored` ou `selected → rejected`. Un
remplacement ne supprime l’ancien asset qu’après stockage réussi du nouveau.

## ProjectTransferEnvelopeV1

```ts
interface ProjectTransferEnvelopeV1 {
  readonly transferVersion: 1;
  readonly exportedAtIso: string;
  readonly applicationVersion: string;
  readonly project: ProjectFileV1;
  readonly projectSha256: string | null;
}
```

Le parseur accepte aussi un `ProjectFileV1` nu pour compatibilité, mais l’export
produit l’enveloppe. L’enveloppe n’ajoute aucune donnée privée au projet.

### ImportConflict

```ts
interface ImportConflict {
  readonly incomingProjectId: string;
  readonly existingProjectName: string;
  readonly incomingProjectName: string;
  readonly sameContent: boolean;
  readonly choices: readonly ('replace' | 'copy' | 'cancel')[];
}
```

La décision `copy` régénère ID et dates après validation du document entrant.

## ProjectRecency

```ts
interface ProjectResumeTarget {
  readonly projectId: string;
  readonly route: string;
  readonly updatedAtIso: string;
}
```

La route doit appartenir au projet et à la liste des sections autorisées. Une
route invalide est remplacée par `/projet/:id/atelier/projet`.

## CatalogStatus

```ts
type CatalogStatus =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly code: string; readonly retryable: boolean }
  | {
      readonly status: 'ready';
      readonly accepted: Readonly<Record<Equipment['kind'], number>>;
      readonly quarantined: Readonly<Record<Equipment['kind'], number>>;
      readonly warnings: number;
      readonly localities: number;
      readonly weatherSources: number;
      readonly metadata: CatalogMetadata;
    };

interface CatalogMetadata {
  readonly version: string | null;
  readonly generatedAtIso: string | null;
  readonly sourceLabel: string;
}
```

Une métadonnée `null` s’affiche « Non renseignée » ou « Version inconnue ».

## CatalogFilterDescriptor

```ts
interface CatalogFilterDescriptor {
  readonly key: 'manufacturer' | 'technology' | 'type' | 'primaryMin' | 'primaryMax' | 'voltageMin' | 'voltageMax';
  readonly labelKey: string;
  readonly unit: string | null;
  readonly kind: 'select' | 'number';
}
```

Les descripteurs dépendent de l’onglet ; l’algorithme de filtrage reste une
fonction pure sur `Equipment[]`.

## DocumentReadiness

```ts
interface DocumentReadiness {
  readonly documentKind: DocKind;
  readonly blockers: readonly DocumentIssue[];
  readonly warnings: readonly DocumentIssue[];
  readonly checkedAtIso: string;
}

interface DocumentIssue {
  readonly code: string;
  readonly fieldPath: string;
  readonly messageKey: string;
}
```

Les blocages proviennent de contrats invalides ou de données indispensables à la
structure du document. Les coordonnées commerciales manquantes sont généralement
des avertissements, sauf règle produit approuvée contraire.

## LicenseState

```ts
type LicenseState =
  | { readonly status: 'unconfigured' }
  | { readonly status: 'checking' }
  | { readonly status: 'active'; readonly edition: string; readonly expiresAtIso: string | null }
  | { readonly status: 'expired'; readonly edition: string; readonly expiredAtIso: string }
  | { readonly status: 'inactive'; readonly reasonKey: string }
  | { readonly status: 'error'; readonly code: string; readonly retryable: boolean };
```

## ApplicationReleaseInfo

```ts
interface ApplicationReleaseInfo {
  readonly version: string;
  readonly channel: 'development' | 'preview' | 'stable';
  readonly builtAtIso: string | null;
  readonly changelogEntries: readonly {
    readonly version: string;
    readonly dateIso: string;
    readonly messageKey: string;
  }[];
}
```
