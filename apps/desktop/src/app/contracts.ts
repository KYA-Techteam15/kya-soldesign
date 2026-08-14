import type { Equipment } from '@ksd/catalog';
import type { CalculationEnvelope, Locality, NormalizedHourlyProfile, SystemKind, WeatherSource } from '@ksd/domain';
import type { ProjectFileV1 } from '@ksd/project-format';

export type UiLocale = 'fr' | 'en';
export type RoadmapFeatureId = 'AIO-001' | 'SIM-001' | 'EQP-001' | 'SAFE-001' | 'FIN-001' | 'DOC-001';
export type CapabilityId = 'presizing' | 'sizing' | 'reliability' | 'equipment-compatibility' | 'protections' | 'finance' | 'dossier';
export type MessageKey = string;

export interface ProjectSessionPort {
  list(): readonly ProjectFileV1[];
  get(id: string): ProjectFileV1 | null;
  create(system: SystemKind, locale: UiLocale): ProjectFileV1;
  replace(project: ProjectFileV1): void;
  remove(id: string): void;
}

export interface CatalogQuery {
  readonly text?: string;
  readonly kind?: Equipment['kind'];
}

export interface CatalogQueryPort {
  list(query?: CatalogQuery): Promise<readonly Equipment[]>;
  listLocalities(): Promise<readonly Locality[]>;
  listWeatherSources(localityId?: string): Promise<readonly WeatherSource[]>;
  listLoadProfiles(): Promise<readonly NormalizedHourlyProfile[]>;
  summary(): Promise<CatalogSummary>;
}

export interface CatalogSummary {
  readonly accepted: Readonly<Record<Equipment['kind'], number>>;
  readonly quarantined: Readonly<Record<Equipment['kind'], number>>;
  readonly warnings: number;
  readonly localities: number;
  readonly weatherSources: number;
}

export type CapabilityState<Output> =
  | { readonly status: 'empty'; readonly messageKey: MessageKey }
  | { readonly status: 'unavailable'; readonly capability: CapabilityId; readonly reasonKey: MessageKey; readonly roadmapOwner: RoadmapFeatureId }
  | { readonly status: 'loading'; readonly messageKey: MessageKey }
  | { readonly status: 'error'; readonly code: string; readonly messageKey: MessageKey; readonly retryable: boolean }
  | { readonly status: 'stale'; readonly previousRunId: string; readonly previousInputHash: string; readonly currentInputHash: string; readonly reasonKey: MessageKey }
  | { readonly status: 'ready'; readonly runId: string; readonly createdAt: string; readonly envelope: CalculationEnvelope<Output> };

export interface CalculationCapabilityPort {
  read<Output>(projectId: string, capability: CapabilityId): Promise<CapabilityState<Output>>;
}

export interface ApplicationServices {
  readonly projects: ProjectSessionPort;
  readonly catalog: CatalogQueryPort;
  readonly calculations: CalculationCapabilityPort;
}
