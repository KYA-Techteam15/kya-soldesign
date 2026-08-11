# Data Model: Validated UI Foundation

## UiLocale

```ts
type UiLocale = 'fr' | 'en';
```

- Default: `fr`.
- Both catalogs contain the exact same typed keys.
- Locale changes presentation only; canonical project and calculation data remain locale-neutral.

## UiTheme

```ts
type UiTheme = 'light' | 'dark';
```

- `sober` is not user state; it is the single approved token system.
- Persistence is not part of UI-BASE-001. Theme may live for the current session only.

## StudyDraft

Use `ProjectFileV1` from `@ksd/project-format` without duplicating it.

UI-BASE constraints:

- `lastCalculation` remains `null`.
- `id` is created at the browser application boundary with `crypto.randomUUID()`.
- `createdAt` and `updatedAt` are application timestamps, never calculation evidence.
- Drafts live only in the current in-memory application service.
- Unknown or legacy browser data is not auto-imported.

## ApplicationSession

```ts
interface ApplicationSession {
  readonly locale: UiLocale;
  readonly theme: UiTheme;
  readonly projects: readonly ProjectFileV1[];
  readonly currentProjectId: string | null;
}
```

This state owns only cross-route UI/session facts. Dialog focus, filters, table edits, and transient form state remain with their nearest feature component unless the project-format contract owns them.

## CapabilityState

```ts
type CapabilityState<T> =
  | { readonly status: 'empty'; readonly messageKey: MessageKey }
  | {
      readonly status: 'unavailable';
      readonly capability: CapabilityId;
      readonly reasonKey: MessageKey;
      readonly roadmapOwner: RoadmapFeatureId;
    }
  | { readonly status: 'loading'; readonly messageKey: MessageKey }
  | {
      readonly status: 'error';
      readonly code: string;
      readonly messageKey: MessageKey;
      readonly retryable: boolean;
    }
  | {
      readonly status: 'stale';
      readonly previous: CalculationEvidenceRef;
      readonly currentInputHash: string;
      readonly reasonKey: MessageKey;
    }
  | {
      readonly status: 'ready';
      readonly run: ImmutableCalculationRun<T>;
    };
```

Invariants:

1. Only `ready` carries current output.
2. `unavailable`, `empty`, `loading`, and `error` carry no engineering or financial value.
3. `stale` is never promoted to current output and must identify the mismatch.
4. UI-BASE production adapters return only `empty`, `loading`, `error`, or `unavailable`.
5. `ready` and `stale` are exercised only through test support until a calculation feature supplies a production adapter.

## ImmutableCalculationRun

```ts
interface ImmutableCalculationRun<T> {
  readonly runId: string;
  readonly createdAt: string;
  readonly envelope: CalculationEnvelope<T>;
}
```

`CalculationEnvelope<T>` comes from `@ksd/domain`. The UI does not mutate output, issues, trace, engine version, or input hash.

## ApplicationServices

```ts
interface ApplicationServices {
  readonly projects: ProjectSessionPort;
  readonly catalog: CatalogQueryPort;
  readonly calculations: CalculationCapabilityPort;
}
```

The provider exposes stable service identities. Components depend on focused hooks/selectors rather than the entire service object.

## CatalogViewItem

A projection of `Equipment` from `@ksd/catalog`:

- canonical id;
- equipment kind;
- manufacturer/model label;
- relevant declared fields and canonical units;
- provenance/source id;
- validation/quality indication where supplied by the catalog contract.

It MUST NOT add:

- compatible/incompatible status;
- recommended quantity;
- calculated coverage;
- inferred missing specifications;
- user-specific selection evidence.

## IntentionalDifference

```ts
interface IntentionalDifference {
  readonly id: string;
  readonly sourceSurface: string;
  readonly targetSurface: string;
  readonly category: 'truthfulness' | 'accessibility' | 'responsiveness' | 'architecture';
  readonly description: string;
  readonly acceptanceEvidence: string;
  readonly approvalRequired: boolean;
}
```

The difference ledger is reviewed during visual acceptance. Cosmetic preference is not a valid category.
