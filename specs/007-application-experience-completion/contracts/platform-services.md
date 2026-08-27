# Contract — Platform services

## ReportAssetRepository

```ts
interface ReportAssetRepository {
  get(id: string): Promise<ReportAsset | null>;
  validate(input: File): Promise<AssetValidationResult>;
  store(input: ValidatedAsset): Promise<ReportAssetMetadata>;
  remove(id: string): Promise<void>;
}
```

Validation checks MIME from bytes where possible, size <= 2 MiB, decodability and
SVG sanitization. The previous asset remains until the new asset is stored and
the settings reference is committed.

## ExchangeRatePort

```ts
interface ExchangeRatePort {
  readonly status: 'unconfigured' | 'available';
  fetchRate(request: ExchangeRateRequest): Promise<ExchangeRateResult>;
}
```

The default adapter is `unconfigured`. A production remote adapter requires an
approved source, timeout, freshness rule, retry policy and provenance mapping.

## LicensePort

```ts
interface LicensePort {
  readState(): Promise<LicenseState>;
  activate?(request: LicenseActivationRequest): Promise<LicenseState>;
  deactivate?(): Promise<LicenseState>;
}
```

Missing optional mutations are rendered unavailable. The default adapter returns
`{ status: 'unconfigured' }`.

## ReleaseInfoPort

```ts
interface ReleaseInfoPort {
  read(): Promise<ApplicationReleaseInfo>;
}
```

The Vite implementation reads generated/versioned metadata. It does not call a
network service to display the installed version.

## Truth-state rule

Every consumer MUST branch on the discriminated state. It is forbidden to convert
`unconfigured`, `unknown`, `error` or `null` into a success label, zero value,
current timestamp or placeholder version.
