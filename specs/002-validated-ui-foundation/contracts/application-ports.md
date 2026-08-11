# Contract: Application ports

## Purpose

React components consume autonomous, typed services. They do not import parent sources, JSON snapshots, storage APIs, or calculation engines directly.

```ts
import type { CalculationEnvelope, SystemKind } from '@ksd/domain';
import type { Equipment } from '@ksd/catalog';
import type { ProjectFileV1 } from '@ksd/project-format';

export interface ProjectSessionPort {
  list(): readonly ProjectFileV1[];
  get(id: string): ProjectFileV1 | null;
  create(system: SystemKind, locale: 'fr' | 'en'): ProjectFileV1;
  replace(project: ProjectFileV1): void;
  remove(id: string): void;
}

export interface CatalogQuery {
  readonly text?: string;
  readonly kind?: Equipment['kind'];
}

export interface CatalogQueryPort {
  list(query?: CatalogQuery): Promise<readonly Equipment[]>;
}

export type RoadmapFeatureId =
  | 'AIO-001'
  | 'SIM-001'
  | 'EQP-001'
  | 'SAFE-001'
  | 'FIN-001'
  | 'DOC-001';

export type CapabilityId =
  | 'presizing'
  | 'sizing'
  | 'reliability'
  | 'equipment-compatibility'
  | 'protections'
  | 'finance'
  | 'dossier';

export type CapabilityState<T> =
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
      readonly previousRunId: string;
      readonly previousInputHash: string;
      readonly currentInputHash: string;
      readonly reasonKey: MessageKey;
    }
  | {
      readonly status: 'ready';
      readonly runId: string;
      readonly createdAt: string;
      readonly envelope: CalculationEnvelope<T>;
    };

export interface CalculationCapabilityPort {
  read<T>(projectId: string, capability: CapabilityId): Promise<CapabilityState<T>>;
}

export interface ApplicationServices {
  readonly projects: ProjectSessionPort;
  readonly catalog: CatalogQueryPort;
  readonly calculations: CalculationCapabilityPort;
}
```

`MessageKey` is imported from the typed i18n catalog. A production UI-BASE calculation adapter always returns `unavailable` with the correct roadmap owner. It never manufactures an envelope.

## Ownership rules

- `ProjectSessionPort` is in-memory only in UI-BASE-001.
- `CatalogQueryPort` parses canonical data through workspace contracts before returning it.
- `CalculationCapabilityPort` is the only future route from UI to calculation evidence.
- Component props may narrow these contracts; they may not add side channels.
- Test adapters reside in test-support modules excluded from production import graphs.

## Error behavior

- Boundary validation errors map to localized `error` states with stable public codes.
- Raw Zod issues, paths, stack traces, and file-system details are not rendered.
- Unknown project ids return an explicit not-found state; they do not create drafts.
