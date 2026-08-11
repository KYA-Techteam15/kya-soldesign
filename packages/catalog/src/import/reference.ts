import {
  localitySchema,
  normalizedHourlyProfileSchema,
  normalizeHourlyEnergyWeights,
  weatherSourceSchema,
  type DataIssue,
  type Locality,
  type NormalizedHourlyProfile,
  type WeatherSource,
} from '@ksd/domain';
import { z } from 'zod';
import { type Equipment, validateEquipment } from '../schemas.js';

export interface ImportSource {
  readonly sourceId: string;
  readonly sourceSha256: string;
  readonly records: readonly unknown[];
}

export interface ImportDocumentSource {
  readonly sourceId: string;
  readonly sourceSha256: string;
  readonly document: unknown;
}

export interface ImportContext {
  readonly transformationVersion: string;
  readonly sha256: (value: string) => string;
}

export interface QuarantinedRecord {
  readonly sourceRecordId: string;
  readonly issues: readonly DataIssue[];
  readonly rawFingerprint: string;
}

export interface ImportConflict {
  readonly identity: string;
  readonly recordIds: readonly string[];
}

export interface ImportReport {
  readonly sourceId: string;
  readonly sourceSha256: string;
  readonly inputRecordCount: number;
  readonly acceptedRecordCount: number;
  readonly quarantinedRecordCount: number;
  readonly warningCount: number;
  readonly duplicateCanonicalIds: readonly string[];
  readonly duplicateCanonicalIdentities: readonly string[];
  readonly conflicts: readonly ImportConflict[];
  readonly transformations: readonly string[];
}

export interface ImportResult<Record> {
  readonly accepted: readonly Record[];
  readonly quarantined: readonly QuarantinedRecord[];
  readonly report: ImportReport;
}

export interface LocalityImportResult extends ImportResult<Locality> {
  readonly canonicalIdBySourceRecordId: ReadonlyMap<string, string>;
}

type JsonRecord = Record<string, unknown>;
type ScalarState = 'missing' | 'parsed' | 'invalid';

interface ScalarResult {
  readonly state: ScalarState;
  readonly value: number | null;
}

interface MappedRecord<Record> {
  readonly sourceRecordId: string;
  readonly rawFingerprint: string;
  readonly record: Record | null;
  readonly issues: readonly DataIssue[];
  readonly conflictIdentity: string | null;
  readonly technicalFingerprint: string | null;
}

export const quarantinedRecordSchema = z.object({
  sourceRecordId: z.string().min(1),
  issues: z.array(z.object({
    code: z.string().min(1), severity: z.enum(['error', 'warning']), message: z.string().min(1), path: z.string().min(1).optional(),
  }).strict()),
  rawFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const importConflictSchema = z.object({
  identity: z.string().min(1),
  recordIds: z.array(z.string().min(1)).min(2),
}).strict();

export const importReportSchema = z.object({
  sourceId: z.string().min(1),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  inputRecordCount: z.number().int().nonnegative(),
  acceptedRecordCount: z.number().int().nonnegative(),
  quarantinedRecordCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  duplicateCanonicalIds: z.array(z.string().min(1)),
  duplicateCanonicalIdentities: z.array(z.string().min(1)),
  conflicts: z.array(importConflictSchema),
  transformations: z.array(z.string().min(1)),
}).strict();

function issue(code: string, severity: DataIssue['severity'], message: string, path?: string): DataIssue {
  return path === undefined ? { code, severity, message } : { code, severity, message, path };
}

function assertDigest(digest: string): string {
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new RangeError('sha256 must return a lowercase 64-character hexadecimal digest');
  }
  return digest;
}

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`;
}

function fingerprint(value: unknown, context: ImportContext): string {
  return assertDigest(context.sha256(stableJson(value)));
}

function technicalFingerprint(record: unknown): string {
  const facts = Object.fromEntries(Object.entries(record as JsonRecord)
    .filter(([key]) => key !== 'id' && key !== 'provenance'));
  return stableJson(facts);
}

function normalizeIdentityPart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLowerCase();
}

export function canonicalIdentity(parts: readonly string[]): string {
  return parts.map(normalizeIdentityPart).join('|');
}

export function canonicalId(prefix: string, identity: string, context: ImportContext): string {
  return `${prefix}_${assertDigest(context.sha256(identity)).slice(0, 24)}`;
}

export function parseLegacyScalar(value: unknown): ScalarResult {
  if (value === null || value === undefined) return { state: 'missing', value: null };
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { state: 'parsed', value } : { state: 'invalid', value: null };
  }
  if (typeof value !== 'string') return { state: 'invalid', value: null };
  const normalized = value.trim();
  if (normalized === '' || /^(?:n\/?a|na|null|unknown|inconnu)$/iu.test(normalized)) {
    return { state: 'missing', value: null };
  }
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/u.test(normalized)) {
    return { state: 'invalid', value: null };
  }
  const parsed = Number(normalized.replace(',', '.'));
  return Number.isFinite(parsed) ? { state: 'parsed', value: parsed } : { state: 'invalid', value: null };
}

function asRecord(value: unknown, issues: DataIssue[]): JsonRecord | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    issues.push(issue('SOURCE_RECORD_NOT_OBJECT', 'error', 'Source record must be an object'));
    return null;
  }
  return value as JsonRecord;
}

function textValue(record: JsonRecord, field: string, issues: DataIssue[], required: boolean): string | null {
  const value = record[field];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (required) {
    issues.push(issue('SOURCE_FIELD_REQUIRED', 'error', `${field} is required`, field));
  } else if (value !== null && value !== undefined && value !== '') {
    issues.push(issue('SOURCE_FIELD_NOT_TEXT', 'warning', `${field} is not usable text`, field));
  }
  return null;
}

function numericValue(record: JsonRecord, field: string, issues: DataIssue[], required: boolean): number | null {
  const parsed = parseLegacyScalar(record[field]);
  if (parsed.state === 'parsed') return parsed.value;
  if (required) {
    issues.push(issue(
      parsed.state === 'invalid' ? 'SOURCE_FIELD_NOT_NUMERIC' : 'SOURCE_FIELD_REQUIRED',
      'error',
      `${field} must be a finite numeric value`,
      field,
    ));
  } else if (parsed.state === 'invalid') {
    issues.push(issue('SOURCE_FIELD_NOT_NUMERIC', 'warning', `${field} is not a usable numeric value`, field));
  }
  return null;
}

function booleanValue(record: JsonRecord, field: string, issues: DataIssue[]): boolean | null {
  const value = record[field];
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const numeric = parseLegacyScalar(value);
  if (numeric.state === 'parsed' && (numeric.value === 0 || numeric.value === 1)) return numeric.value === 1;
  issues.push(issue('SOURCE_FIELD_NOT_BOOLEAN', 'warning', `${field} must be boolean or 0/1`, field));
  return null;
}

function sourceRecordId(record: JsonRecord, issues: DataIssue[], index: number): string {
  const value = record['id'];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  issues.push(issue('SOURCE_RECORD_ID_REQUIRED', 'error', 'id is required for deterministic import', 'id'));
  return `invalid-index-${index}`;
}

function provenance(source: ImportSource | ImportDocumentSource, sourceRecordIdValue: string, context: ImportContext) {
  return {
    sourceId: source.sourceId,
    sourceRecordId: sourceRecordIdValue,
    sourceSha256: source.sourceSha256,
    transformationVersion: context.transformationVersion,
  };
}

function finalize<Record extends { id: string }>(
  source: ImportSource | ImportDocumentSource,
  mapped: readonly MappedRecord<Record>[],
  transformations: readonly string[],
): ImportResult<Record> {
  const accepted = mapped
    .filter((entry): entry is MappedRecord<Record> & { record: Record } => entry.record !== null
      && !entry.issues.some((entryIssue) => entryIssue.severity === 'error'))
    .map((entry) => entry.record)
    .sort((left, right) => compareText(left.id, right.id));
  const quarantined = mapped
    .filter((entry) => entry.record === null || entry.issues.some((entryIssue) => entryIssue.severity === 'error'))
    .map((entry) => ({
      sourceRecordId: entry.sourceRecordId,
      issues: entry.issues,
      rawFingerprint: entry.rawFingerprint,
    }))
    .sort((left, right) => compareText(left.sourceRecordId, right.sourceRecordId));
  const ids = accepted.map((entry) => entry.id);
  const duplicateCanonicalIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]
    .sort(compareText);
  const duplicateCanonicalIdentities = [...new Set(mapped
    .map((entry) => entry.conflictIdentity)
    .filter((identity): identity is string => identity !== null)
    .filter((identity, index, identities) => identities.indexOf(identity) !== index))]
    .sort(compareText);
  const conflictGroups = mapped
    .filter((entry): entry is MappedRecord<Record> & { record: Record; conflictIdentity: string } => entry.record !== null
      && entry.conflictIdentity !== null)
    .reduce<Map<string, Map<string, string[]>>>((groups, entry) => {
      const byTechnicalValue = groups.get(entry.conflictIdentity) ?? new Map<string, string[]>();
      const records = byTechnicalValue.get(entry.technicalFingerprint ?? '') ?? [];
      records.push(entry.record.id);
      byTechnicalValue.set(entry.technicalFingerprint ?? '', records);
      groups.set(entry.conflictIdentity, byTechnicalValue);
      return groups;
    }, new Map());
  const conflicts = [...conflictGroups.entries()]
    .filter(([, recordsByTechnicalValue]) => recordsByTechnicalValue.size > 1)
    .map(([identity, recordsByTechnicalValue]) => ({
      identity,
      recordIds: [...recordsByTechnicalValue.values()].flat().sort(compareText),
    }))
    .sort((left, right) => compareText(left.identity, right.identity));
  const warningCount = mapped.flatMap((entry) => entry.issues).filter((entry) => entry.severity === 'warning').length;

  return {
    accepted,
    quarantined,
    report: {
      sourceId: source.sourceId,
      sourceSha256: source.sourceSha256,
      inputRecordCount: mapped.length,
      acceptedRecordCount: accepted.length,
      quarantinedRecordCount: quarantined.length,
      warningCount,
      duplicateCanonicalIds,
      duplicateCanonicalIdentities,
      conflicts,
      transformations: [...transformations].sort(compareText),
    },
  };
}

function mapEquipment(
  source: ImportSource,
  context: ImportContext,
  kind: Equipment['kind'],
  map: (record: JsonRecord, sourceRecordIdValue: string, issues: DataIssue[]) => Equipment | null,
): ImportResult<Equipment> {
  const mapped = source.records.map((raw, index) => {
    const issues: DataIssue[] = [];
    const record = asRecord(raw, issues);
    const id = record ? sourceRecordId(record, issues, index) : `invalid-index-${index}`;
    const candidate = record ? map(record, id, issues) : null;
    const validation = candidate ? validateEquipment(candidate) : { equipment: null, issues: [] };
    return {
      sourceRecordId: id,
      rawFingerprint: fingerprint(raw, context),
      record: validation.equipment,
      issues: [...issues, ...validation.issues],
      conflictIdentity: candidate && record
        ? canonicalIdentity([kind, candidate.manufacturer, candidate.model])
        : null,
      technicalFingerprint: validation.equipment ? technicalFingerprint(validation.equipment) : null,
    };
  });
  return finalize(source, mapped, ['identity-v1', 'reference-equipment-v1']);
}

function equipmentBase(
  record: JsonRecord,
  kind: Equipment['kind'],
  source: ImportSource,
  sourceRecordIdValue: string,
  context: ImportContext,
  issues: DataIssue[],
) {
  const manufacturer = textValue(record, 'maker', issues, true);
  const model = textValue(record, 'code', issues, true);
  if (!manufacturer || !model) return null;
  return {
    id: canonicalId(kind, canonicalIdentity([kind, manufacturer, model, source.sourceId, sourceRecordIdValue]), context),
    manufacturer,
    model,
    provenance: provenance(source, sourceRecordIdValue, context),
  };
}

export function importReferencePvModules(source: ImportSource, context: ImportContext): ImportResult<Equipment> {
  return mapEquipment(source, context, 'pv-module', (record, sourceRecordIdValue, issues) => {
    const base = equipmentBase(record, 'pv-module', source, sourceRecordIdValue, context, issues);
    const nominalPowerW = numericValue(record, 'power', issues, true);
    const voltageAtMaximumPowerV = numericValue(record, 'vmp', issues, true);
    const openCircuitVoltageV = numericValue(record, 'voc_stc', issues, true);
    const currentAtMaximumPowerA = numericValue(record, 'imp_stc', issues, true);
    const shortCircuitCurrentA = numericValue(record, 'isc_stc', issues, true);
    if (!base || nominalPowerW === null || voltageAtMaximumPowerV === null || openCircuitVoltageV === null
      || currentAtMaximumPowerA === null || shortCircuitCurrentA === null) return null;
    return {
      ...base,
      kind: 'pv-module',
      nominalPowerW,
      voltageAtMaximumPowerV,
      openCircuitVoltageV,
      currentAtMaximumPowerA,
      shortCircuitCurrentA,
      technology: textValue(record, 'module_type', issues, false),
      areaM2: numericValue(record, 'area', issues, false),
      temperatureCoefficientPmaxPerC: numericValue(record, 'coef_temp_pmp', issues, false),
      temperatureCoefficientVocPerC: numericValue(record, 'coef_temp_voc', issues, false),
      nominalOperatingCellTemperatureC: numericValue(record, 'tnoct', issues, false),
    };
  });
}

export function importReferenceBatteries(source: ImportSource, context: ImportContext): ImportResult<Equipment> {
  return mapEquipment(source, context, 'battery', (record, sourceRecordIdValue, issues) => {
    const base = equipmentBase(record, 'battery', source, sourceRecordIdValue, context, issues);
    const nominalVoltageV = numericValue(record, 'voltage', issues, true);
    const nominalCapacityAh = numericValue(record, 'capacity', issues, true);
    if (!base || nominalVoltageV === null || nominalCapacityAh === null) return null;
    const cycleLife = numericValue(record, 'cycle_life', issues, false);
    if (cycleLife !== null && (!Number.isInteger(cycleLife) || cycleLife <= 0)) {
      issues.push(issue('BATTERY_CYCLE_LIFE_INVALID', 'warning', 'cycle_life must be a positive integer when provided', 'cycle_life'));
    }
    return {
      ...base,
      kind: 'battery',
      nominalVoltageV,
      nominalCapacityAh,
      nominalEnergyWh: nominalVoltageV * nominalCapacityAh,
      usableDepthOfDischargeRatio: ratioFromPercentage(record, 'max_dod', issues),
      roundTripEfficiencyRatio: ratioFromPercentage(record, 'round_trip_efficiency', issues),
      cycleLife: cycleLife !== null && Number.isInteger(cycleLife) && cycleLife > 0 ? cycleLife : null,
      technology: textValue(record, 'technology', issues, false),
    };
  });
}

function ratioFromPercentage(record: JsonRecord, field: string, issues: DataIssue[]): number | null {
  const value = numericValue(record, field, issues, false);
  if (value === null) return null;
  const ratio = value / 100;
  if (ratio < 0 || ratio > 1) {
    issues.push(issue('SOURCE_PERCENTAGE_OUT_OF_RANGE', 'warning', `${field} must be between 0 and 100`, field));
    return null;
  }
  return ratio;
}

export function importReferenceInverters(source: ImportSource, context: ImportContext): ImportResult<Equipment> {
  return mapEquipment(source, context, 'inverter', (record, sourceRecordIdValue, issues) => {
    const base = equipmentBase(record, 'inverter', source, sourceRecordIdValue, context, issues);
    const nominalAcPowerW = numericValue(record, 'nominal_power', issues, true);
    const nominalDcVoltageV = numericValue(record, 'nominal_dc_voltage', issues, true);
    if (!base || nominalAcPowerW === null || nominalDcVoltageV === null) return null;
    const efficiency = ratioFromPercentage(record, 'efficiency', issues);
    const maxParallelUnits = numericValue(record, 'max_parallel_units', issues, false);
    return {
      ...base,
      kind: 'inverter',
      nominalAcPowerW,
      nominalDcVoltageV,
      surgePowerW: numericValue(record, 'overload_power', issues, false),
      nominalAcVoltageV: numericValue(record, 'nominal_ac_voltage', issues, false),
      efficiencyRatio: efficiency,
      pvArrayMaxPowerW: numericValue(record, 'pv_array_max_power', issues, false),
      mpptMinVoltageV: numericValue(record, 'mppt_min_voltage', issues, false),
      mpptMaxVoltageV: numericValue(record, 'mppt_max_voltage', issues, false),
      pvOpenCircuitMaxVoltageV: numericValue(record, 'pv_open_circuit_max_voltage', issues, false),
      pvInputsNumber: positiveInteger(record, 'pv_inputs_number', issues),
      maxChargingCurrentA: numericValue(record, 'max_charging_current', issues, false),
      maxParallelUnits: maxParallelUnits !== null && Number.isInteger(maxParallelUnits) && maxParallelUnits > 0 ? maxParallelUnits : null,
      canBeInParallel: booleanValue(record, 'can_be_in_parallel', issues),
      inverterType: textValue(record, 'inverter_type', issues, false),
    };
  });
}

function positiveInteger(record: JsonRecord, field: string, issues: DataIssue[]): number | null {
  const value = numericValue(record, field, issues, false);
  if (value === null) return null;
  if (!Number.isInteger(value) || value <= 0) {
    issues.push(issue('SOURCE_FIELD_NOT_POSITIVE_INTEGER', 'warning', `${field} must be a positive integer`, field));
    return null;
  }
  return value;
}

export function importReferenceLocalities(source: ImportSource, context: ImportContext): LocalityImportResult {
  const mapped = source.records.map((raw, index) => {
    const issues: DataIssue[] = [];
    const record = asRecord(raw, issues);
    const sourceRecordIdValue = record ? sourceRecordId(record, issues, index) : `invalid-index-${index}`;
    const name = record ? textValue(record, 'name', issues, true) : null;
    const countryCode = record ? textValue(record, 'country_code', issues, true)?.toUpperCase() ?? null : null;
    const latitudeDeg = record ? numericValue(record, 'latitude', issues, true) : null;
    const longitudeDeg = record ? numericValue(record, 'longitude', issues, true) : null;
    const candidate = name && countryCode && latitudeDeg !== null && longitudeDeg !== null
      ? localitySchema.safeParse({
        id: canonicalId('locality', canonicalIdentity(['locality', name, countryCode, source.sourceId, sourceRecordIdValue]), context),
        name,
        countryCode,
        latitudeDeg,
        longitudeDeg,
        elevationM: null,
        timezone: null,
        provenance: provenance(source, sourceRecordIdValue, context),
      })
      : null;
    if (candidate && !candidate.success) {
      for (const validationIssue of candidate.error.issues) {
        issues.push(issue('LOCALITY_SCHEMA_INVALID', 'error', validationIssue.message, validationIssue.path.join('.')));
      }
    }
    return {
      sourceRecordId: sourceRecordIdValue,
      rawFingerprint: fingerprint(raw, context),
      record: candidate?.success ? candidate.data : null,
      issues,
      conflictIdentity: candidate?.success ? canonicalIdentity(['locality', candidate.data.name, candidate.data.countryCode]) : null,
      technicalFingerprint: candidate?.success ? technicalFingerprint(candidate.data) : null,
    };
  });
  const result = finalize(source, mapped, ['identity-v1', 'reference-locality-v1']);
  const canonicalIdBySourceRecordId = new Map<string, string>();
  for (const entry of mapped) {
    if (entry.record !== null && !entry.issues.some((entryIssue) => entryIssue.severity === 'error')) {
      canonicalIdBySourceRecordId.set(entry.sourceRecordId, entry.record.id);
    }
  }
  return { ...result, canonicalIdBySourceRecordId };
}

export function importReferenceWeatherSources(
  source: ImportSource,
  localityIdsBySourceRecordId: ReadonlyMap<string, string>,
  context: ImportContext,
): ImportResult<WeatherSource> {
  const mapped = source.records.map((raw, index) => {
    const issues: DataIssue[] = [];
    const record = asRecord(raw, issues);
    const sourceRecordIdValue = record ? sourceRecordId(record, issues, index) : `invalid-index-${index}`;
    const sourceLocalityId = record ? textValue(record, 'locality_id', issues, true) : null;
    const localityId = sourceLocalityId ? localityIdsBySourceRecordId.get(sourceLocalityId) ?? null : null;
    if (sourceLocalityId && localityId === null) {
      issues.push(issue('WEATHER_SOURCE_LOCALITY_UNKNOWN', 'error', 'locality_id does not resolve to an imported locality', 'locality_id'));
    }
    const provider = record ? textValue(record, 'provider', issues, true) : null;
    const sourceName = record ? textValue(record, 'source_name', issues, true) : null;
    const defaultTiltDeg = record ? numericValue(record, 'default_tilt', issues, false) : null;
    const defaultAzimuthDeg = record ? numericValue(record, 'default_azimuth', issues, false) : null;
    const candidate = localityId && provider && sourceName
      ? weatherSourceSchema.safeParse({
        id: canonicalId('weather-source', canonicalIdentity(['weather-source', provider, sourceName, source.sourceId, sourceRecordIdValue]), context),
        localityId,
        provider,
        sourceName,
        defaultTiltDeg,
        defaultAzimuthDeg,
        provenance: provenance(source, sourceRecordIdValue, context),
      })
      : null;
    if (candidate && !candidate.success) {
      for (const validationIssue of candidate.error.issues) {
        issues.push(issue('WEATHER_SOURCE_SCHEMA_INVALID', 'error', validationIssue.message, validationIssue.path.join('.')));
      }
    }
    return {
      sourceRecordId: sourceRecordIdValue,
      rawFingerprint: fingerprint(raw, context),
      record: candidate?.success ? candidate.data : null,
      issues,
      conflictIdentity: candidate?.success
        ? canonicalIdentity(['weather-source', candidate.data.localityId, candidate.data.provider, candidate.data.sourceName])
        : null,
      technicalFingerprint: candidate?.success ? technicalFingerprint(candidate.data) : null,
    };
  });
  return finalize(source, mapped, ['identity-v1', 'reference-weather-source-v1']);
}

export function importLegacyLoadProfiles(source: ImportDocumentSource, context: ImportContext): ImportResult<NormalizedHourlyProfile> {
  const document = asRecord(source.document, []);
  const profiles = document?.['profiles'];
  const profileRoot = profiles && typeof profiles === 'object' && !Array.isArray(profiles) ? profiles as JsonRecord : null;
  const mapped: MappedRecord<NormalizedHourlyProfile>[] = [];
  if (!profileRoot) {
    return finalize<NormalizedHourlyProfile>(source, [{
      sourceRecordId: 'document',
      rawFingerprint: fingerprint(source.document, context),
      record: null,
      issues: [issue('PROFILE_DOCUMENT_INVALID', 'error', 'profiles object is required', 'profiles')],
      conflictIdentity: null,
      technicalFingerprint: null,
    }], ['legacy-profile-normalization-v1']);
  }

  for (const profileSetKey of Object.keys(profileRoot).sort(compareText)) {
    const profileSet = asRecord(profileRoot[profileSetKey], []);
    const categories = profileSet?.['categories'];
    const categoryRoot = categories && typeof categories === 'object' && !Array.isArray(categories) ? categories as JsonRecord : null;
    if (!categoryRoot) {
      mapped.push({
        sourceRecordId: profileSetKey,
        rawFingerprint: fingerprint(profileSet, context),
        record: null,
        issues: [issue('PROFILE_CATEGORIES_INVALID', 'error', 'categories object is required', 'categories')],
        conflictIdentity: null,
        technicalFingerprint: null,
      });
      continue;
    }
    for (const categoryKey of Object.keys(categoryRoot).sort(compareText)) {
      const issues: DataIssue[] = [];
      const category = asRecord(categoryRoot[categoryKey], issues);
      const sourceRecordIdValue = `${profileSetKey}:${categoryKey}`;
      const displayName = category ? textValue(category, 'display_name', issues, true) : null;
      const shape = category?.['shape'];
      const weights = Array.isArray(shape) ? shape.map((value, index) => {
        const parsed = parseLegacyScalar(value);
        if (parsed.state !== 'parsed') {
          issues.push(issue('PROFILE_WEIGHT_INVALID', 'error', 'shape values must be finite numbers', `shape.${index}`));
        }
        return parsed.value;
      }) : null;
      if (!Array.isArray(shape)) {
        issues.push(issue('PROFILE_SHAPE_INVALID', 'error', 'shape must be an array', 'shape'));
      }
      let fractions: readonly number[] | null = null;
      if (weights && weights.every((weight): weight is number => weight !== null)) {
        try {
          fractions = normalizeHourlyEnergyWeights(weights);
        } catch (error) {
          issues.push(issue('PROFILE_NORMALIZATION_INVALID', 'error', error instanceof Error ? error.message : 'profile normalization failed', 'shape'));
        }
      }
      const candidate = displayName && fractions
        ? normalizedHourlyProfileSchema.safeParse({
          id: canonicalId('load-profile', canonicalIdentity(['load-profile', categoryKey, source.sourceId, sourceRecordIdValue]), context),
          displayName,
          hourlyEnergyFractions: fractions,
          provenance: provenance(source, sourceRecordIdValue, context),
        })
        : null;
      if (candidate && !candidate.success) {
        for (const validationIssue of candidate.error.issues) {
          issues.push(issue('PROFILE_SCHEMA_INVALID', 'error', validationIssue.message, validationIssue.path.join('.')));
        }
      }
      mapped.push({
        sourceRecordId: sourceRecordIdValue,
        rawFingerprint: fingerprint(categoryRoot[categoryKey], context),
        record: candidate?.success ? candidate.data : null,
        issues,
        conflictIdentity: candidate?.success ? canonicalIdentity(['load-profile', categoryKey]) : null,
        technicalFingerprint: candidate?.success ? technicalFingerprint(candidate.data) : null,
      });
    }
  }
  return finalize(source, mapped, ['identity-v1', 'legacy-profile-normalization-v1']);
}
