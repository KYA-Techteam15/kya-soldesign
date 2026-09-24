import type { Equipment, EquipmentRecordV2, PvgisTmyJson, WeatherFileRecord } from '@ksd/catalog';
import type { CalculationEnvelope, Locality, NormalizedHourlyProfile, SystemKind, WeatherSource } from '@ksd/domain';
import type { CompatibleInverterCandidate, PresizingEnvelopeV1, PresizingProgress, RetainedSystemSimulationV1, SizingEnvelopeV1, SizingProgress } from '@ksd/engine';
import type { ProjectFileV1 } from '@ksd/project-format';
import type { LicenseState } from './models/license.js';
import type { ApplicationReleaseInfo } from './models/releaseInfo.js';

export type UiLocale = 'fr' | 'en';
export type RoadmapFeatureId = 'AIO-001' | 'SIM-001' | 'EQP-001' | 'SAFE-001' | 'FIN-001' | 'DOC-001';
export type CapabilityId = 'presizing' | 'sizing' | 'solar-resource' | 'reliability' | 'equipment-compatibility' | 'protections' | 'finance' | 'dossier';
export type MessageKey = string;

export interface ProjectSessionPort {
  list(): readonly ProjectFileV1[];
  get(id: string): ProjectFileV1 | null;
  create(system: SystemKind, locale: UiLocale): ProjectFileV1;
  add(project: ProjectFileV1): void;
  replace(project: ProjectFileV1): void;
  remove(id: string): void;
}

export interface ProjectFileTransferPort {
  pickTextFile(request: { readonly accept: string }): Promise<{ readonly name: string; readonly text: string } | null>;
  saveTextFile(request: { readonly filename: string; readonly text: string; readonly mimeType: string }): Promise<void>;
}

export interface ExchangeRatePort {
  readonly status: 'unconfigured' | 'available';
  fetchRate(request: { readonly baseCurrencyCode: string; readonly quoteCurrencyCode: string }): Promise<unknown>;
}

export interface LicensePort {
  readState(): Promise<LicenseState>;
  activate?(): Promise<LicenseState>;
  deactivate?(): Promise<LicenseState>;
}

export interface ReleaseInfoPort { read(): Promise<ApplicationReleaseInfo>; }

export interface CatalogQuery {
  readonly text?: string;
  readonly kind?: Equipment['kind'];
}

export interface CatalogQueryPort {
  list(query?: CatalogQuery): Promise<readonly Equipment[]>;
  listLocalities(): Promise<readonly Locality[]>;
  listWeatherSources(localityId?: string): Promise<readonly WeatherSource[]>;
  listWeatherFiles(): Promise<readonly CanonicalWeatherFile[]>;
  listLoadProfiles(): Promise<readonly NormalizedHourlyProfile[]>;
  summary(): Promise<CatalogSummary>;
}

export interface UserCatalogPort {
  list(): Promise<readonly EquipmentRecordV2[]>;
  create(record: EquipmentRecordV2): Promise<void>;
  replace(record: EquipmentRecordV2, expectedVersion: number): Promise<void>;
  archive(id: string, expectedVersion: number): Promise<void>;
}

export interface CanonicalWeatherFile {
  readonly metadata: WeatherFileRecord;
  readonly document: PvgisTmyJson;
}

export interface SavedWeatherCatalogRecord {
  readonly key: string;
  readonly locality: Locality;
  readonly source: WeatherSource;
  readonly file: CanonicalWeatherFile;
}

export interface WeatherLibraryPort {
  list(): Promise<readonly SavedWeatherCatalogRecord[]>;
  save(record: SavedWeatherCatalogRecord): Promise<void>;
}

export interface WeatherAcquisitionPort {
  downloadTmy(request: { readonly latitudeDeg: number; readonly longitudeDeg: number; readonly timezoneIana: string; readonly signal?: AbortSignal }): Promise<{ readonly file: CanonicalWeatherFile; readonly locator: string }>;
  parseTmyJson(request: { readonly text: string; readonly filename: string; readonly timezoneIana: string }): Promise<{ readonly file: CanonicalWeatherFile; readonly locator: string }>;
}

export interface CatalogSummary {
  readonly accepted: Readonly<Record<Equipment['kind'], number>>;
  readonly quarantined: Readonly<Record<Equipment['kind'], number>>;
  readonly warnings: number;
  readonly localities: number;
  readonly weatherSources: number;
  readonly metadata?: { readonly version: string | null; readonly generatedAtIso: string | null; readonly sourceLabel: string };
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
  runPresizing?(projectId: string, onProgress: (progress: PresizingProgress) => void): Promise<PresizingEnvelopeV1>;
  runSizing?(projectId: string, onProgress: (progress: SizingProgress) => void): Promise<SizingEnvelopeV1>;
  /** Onduleurs recevables avec la configuration que le moteur retiendrait. */
  compatibleInverters?(projectId: string): Promise<readonly CompatibleInverterCandidate[]>;
  simulateSystems?(projectId: string, systems: readonly { readonly pvPeakKw: number; readonly storageKwh: number; readonly inverterKw: number }[]): Promise<readonly RetainedSystemSimulationV1[] | null>;
}

export interface ApplicationServices {
  readonly projects: ProjectSessionPort;
  readonly catalog: CatalogQueryPort;
  readonly calculations: CalculationCapabilityPort;
}
