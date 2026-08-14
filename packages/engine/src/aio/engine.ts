import {
  aioSizingRequestV1Schema,
  assumptionSourceV1Schema,
  provenanceSchema,
  solarDesignResourceV1Schema,
  startupEventV1Schema,
  type AioSizingRequestV1,
  type CalculationIssue,
  type Provenance,
  type SystemKind,
} from '@ksd/domain';
import { calculateDailyDcEnergyWh, calculateMinimumPvStcPowerW, calculatePeakSunHoursHPerDay } from './calculations/energy-pv.js';
import { summarizeDailyLoad } from './calculations/load.js';
import { calculateInverterSurgeAcPowerW, calculateLeadAcidNominalCapacityAh, calculateLeadAcidNominalStorageWh, calculateMinimumUsableStorageWh } from './calculations/storage-inverter.js';
import type { AioCalculationRequestV1, AioOutputId, AioOutputValue, AioSizingEngineV1, AioSizingEnvelopeV1, AioSizingOutputV1, AioUnit, ConstraintViolationV1, EngineWarningV1, FormulaTraceV1 } from './contracts.js';
import { hashDiagnosticInput, hashTechnicalInput } from './inputHash.js';

interface RecoverableBoundaryViolation {
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly outputIds: readonly AioOutputId[];
}

interface BoundaryRecovery {
  readonly input: unknown;
  readonly violations: readonly RecoverableBoundaryViolation[];
}

const allOutputs: readonly AioOutputId[] = [
  'dailyAcEnergyWh', 'peakCoincidentAcPowerW', 'dailyDcEnergyWh', 'designPeakSunHoursHPerDay', 'minimumPvStcPowerW',
  'minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh',
  'minimumInverterContinuousAcPowerW', 'minimumInverterSurgeAcPowerW',
];

const loadDerivedOutputs = allOutputs.filter((outputId) => outputId !== 'designPeakSunHoursHPerDay');
const solarOutputs: readonly AioOutputId[] = ['designPeakSunHoursHPerDay', 'minimumPvStcPowerW'];
const nominalStorageOutputs: readonly AioOutputId[] = ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'];
const nominalCapacityOutputs: readonly AioOutputId[] = ['minimumLeadAcidNominalCapacityAh'];

const sourceByFormula: Readonly<Record<string, readonly string[]>> = {
  'CALC-AIO-001': ['SRC-AIO-003'],
  'CALC-AIO-002': ['SRC-AIO-002'],
  'CALC-AIO-003': ['SRC-AIO-002', 'SRC-AIO-003'],
  'CALC-AIO-004': ['SRC-AIO-001', 'SRC-AIO-002'],
  'CALC-AIO-005': ['SRC-AIO-002', 'SRC-AIO-004'],
  'CALC-AIO-006': ['SRC-AIO-001', 'SRC-AIO-005'],
  'CALC-AIO-007': ['SRC-AIO-004'],
};

const recoveryProvenance: Provenance = {
  sourceId: 'internal:boundary-recovery',
  sourceRecordId: 'invalid-input',
  sourceSha256: '0'.repeat(64),
  transformationVersion: '1.0.0',
};

export class AioSizingEngine implements AioSizingEngineV1 {
  public readonly version: string;

  public constructor(version = '1.0.0') { this.version = version; }

  public async calculate(request: AioCalculationRequestV1): Promise<AioSizingEnvelopeV1> {
    return this.calculateSync(request);
  }

  public calculateSync(request: AioCalculationRequestV1): AioSizingEnvelopeV1 {
    if (request.system !== 'standalone-all-in-one') throw new RangeError(`AIO engine does not support ${request.system satisfies SystemKind}`);
    const parsed = aioSizingRequestV1Schema.safeParse(request.input);
    if (parsed.success) return this.validEnvelope(parsed.data, [], parsed.data, true);

    const recovery = recoverBoundaryInput(request.input);
    if (recovery === undefined) {
      const paths = parsed.error.issues.map((issue) => issue.path.join('.') || 'input');
      return this.invalidEnvelope(request.input, paths);
    }
    const recovered = aioSizingRequestV1Schema.safeParse(recovery.input);
    if (!recovered.success) {
      const paths = parsed.error.issues.map((issue) => issue.path.join('.') || 'input');
      return this.invalidEnvelope(request.input, paths);
    }
    return this.validEnvelope(recovered.data, recovery.violations, request.input, false);
  }

  private invalidEnvelope(input: unknown, paths: readonly string[]): AioSizingEnvelopeV1 {
    const constraint = this.constraint('AIO_INVALID_REQUEST_SHAPE', 'AIO input cannot be recovered as a typed request', paths.join(', ') || 'input', allOutputs);
    const output = Object.fromEntries(allOutputs.map((id) => [id, blocked([constraint.code])])) as unknown as AioSizingOutputV1;
    return this.envelope(input, output, [constraint], [], [], false);
  }

  private validEnvelope(input: AioSizingRequestV1, boundaryViolations: readonly RecoverableBoundaryViolation[], identityInput: unknown, canonicalInput: boolean): AioSizingEnvelopeV1 {
    const constraints: ConstraintViolationV1[] = [];
    const warnings: EngineWarningV1[] = [];
    const traces: FormulaTraceV1[] = [];
    const blockedBy = new Map<AioOutputId, string[]>();
    const block = (code: string, outputIds: readonly AioOutputId[], message: string, path: string) => {
      const existingIndex = constraints.findIndex((violation) => violation.code === code && violation.path === path);
      if (existingIndex === -1) {
        constraints.push(this.constraint(code, message, path, outputIds));
      } else {
        const existing = constraints[existingIndex]!;
        const mergedOutputIds = [...existing.blocksOutputIds, ...outputIds.filter((outputId) => !existing.blocksOutputIds.includes(outputId))];
        constraints[existingIndex] = { ...existing, blocksOutputIds: mergedOutputIds };
      }
      for (const outputId of outputIds) {
        const codes = blockedBy.get(outputId) ?? [];
        blockedBy.set(outputId, codes.includes(code) ? codes : [...codes, code]);
      }
    };
    for (const violation of boundaryViolations) block(violation.code, violation.outputIds, violation.message, violation.path);
    const hasAssumptionSource = (assumptionId: string) => input.assumptions.assumptionSources.some((source) => source.assumptionId === assumptionId);
    const available = (outputId: AioOutputId, value: number, unit: AioUnit, formulaId: keyof typeof sourceByFormula, inputValues: Readonly<Record<string, number | string>>): AioOutputValue => {
      const constraintIds = blockedBy.get(outputId);
      if (constraintIds !== undefined) return blocked(constraintIds);
      const traceId = `trace:${outputId}`;
      const sourceIds = sourceByFormula[formulaId]!;
      traces.push({ id: traceId, formulaId, sourceId: sourceIds[0]!, sourceIds, inputPaths: Object.keys(inputValues), outputPath: `output.${outputId}`, substitutedValues: inputValues });
      return { status: 'available', value, unit, traceIds: [traceId] };
    };

    const summary = summarizeDailyLoad(input.load.hourlyEnergyWh);
    if (summary.dailyAcEnergyWh === 0 && !blockedBy.has('dailyAcEnergyWh')) warnings.push({ code: 'AIO_ZERO_LOAD', message: 'Daily AC load is zero; calculated minima are zero.' });
    const hourlyEnergy = input.load.hourlyEnergyWh.join(',');
    const dailyAcEnergyWh = available('dailyAcEnergyWh', summary.dailyAcEnergyWh, 'Wh', 'CALC-AIO-001', { 'load.hourlyEnergyWh': hourlyEnergy });
    const meterProfileUnsourced = input.load.basis === 'meter-estimate' && input.load.derivation?.sourceProfileId === undefined;
    if (meterProfileUnsourced) {
      block('AIO_METER_PROFILE_UNSOURCED', ['peakCoincidentAcPowerW', 'minimumInverterContinuousAcPowerW', 'minimumInverterSurgeAcPowerW'], 'A meter estimate needs a declared sourced hourly profile for peak and inverter sizing', 'load.derivation.sourceProfileId');
    }
    const peakCoincidentAcPowerW = available('peakCoincidentAcPowerW', summary.peakCoincidentAcPowerW, 'W', 'CALC-AIO-001', { 'load.hourlyEnergyWh': hourlyEnergy });
    const minimumInverterContinuousAcPowerW = available('minimumInverterContinuousAcPowerW', summary.peakCoincidentAcPowerW, 'W', 'CALC-AIO-007', { 'load.hourlyEnergyWh': hourlyEnergy });

    const incompleteStartup = input.load.startupEvents.some((event) => event.isInductive && event.startupPowerMultiplier === null);
    if (incompleteStartup) block('AIO_MISSING_STARTUP_MULTIPLIER', ['minimumInverterSurgeAcPowerW'], 'An inductive load needs an explicit startup multiplier', 'load.startupEvents');
    const minimumInverterSurgeAcPowerW = blockedBy.has('minimumInverterSurgeAcPowerW')
      ? blocked(blockedBy.get('minimumInverterSurgeAcPowerW')!)
      : available('minimumInverterSurgeAcPowerW', calculateInverterSurgeAcPowerW(input.load.hourlyEnergyWh, input.load.startupEvents), 'W', 'CALC-AIO-007', { 'load.hourlyEnergyWh': hourlyEnergy, 'load.startupEvents': JSON.stringify(input.load.startupEvents) });

    const inverterEfficiency = input.assumptions.inverterEfficiencyRatio;
    if (inverterEfficiency === undefined) block('AIO_MISSING_INVERTER_EFFICIENCY', ['dailyDcEnergyWh', 'minimumPvStcPowerW', 'minimumUsableStorageWh', ...nominalStorageOutputs], 'Inverter efficiency is required for DC energy and dependent outputs', 'assumptions.inverterEfficiencyRatio');
    if (inverterEfficiency !== undefined && !hasAssumptionSource('inverterEfficiencyRatio')) block('AIO_MISSING_ASSUMPTION_SOURCE', ['dailyDcEnergyWh', 'minimumPvStcPowerW', 'minimumUsableStorageWh', ...nominalStorageOutputs], 'Inverter efficiency must have declared provenance', 'assumptions.assumptionSources');
    const dailyDcValue = inverterEfficiency === undefined ? undefined : calculateDailyDcEnergyWh(summary.dailyAcEnergyWh, inverterEfficiency);
    const dailyDcEnergyWh = dailyDcValue === undefined ? blocked(blockedBy.get('dailyDcEnergyWh') ?? ['AIO_MISSING_INVERTER_EFFICIENCY']) : available('dailyDcEnergyWh', dailyDcValue, 'Wh', 'CALC-AIO-002', { 'output.dailyAcEnergyWh': summary.dailyAcEnergyWh, 'assumptions.inverterEfficiencyRatio': inverterEfficiency! });

    if (input.solarDesignResource === undefined && !blockedBy.has('designPeakSunHoursHPerDay')) block('AIO_MISSING_SOLAR_RESOURCE', solarOutputs, 'A sourced plane-of-array solar resource is required', 'solarDesignResource');
    const site = input.technicalContext.site;
    const solar = input.solarDesignResource;
    const resourceOrientationMatches = solar !== undefined
      && site.arrayTiltDeg !== undefined && site.arrayAzimuthDeg !== undefined
      && site.arrayTiltDeg === solar.arrayTiltDeg && site.arrayAzimuthDeg === solar.arrayAzimuthDeg;
    if (solar !== undefined && !resourceOrientationMatches && !blockedBy.has('designPeakSunHoursHPerDay')) {
      block('AIO_INVALID_SOLAR_RESOURCE', solarOutputs, 'Plane-of-array resource orientation must match the declared technical site orientation', 'solarDesignResource.arrayTiltDeg');
    }
    const pshValue = solar === undefined || !resourceOrientationMatches ? undefined : calculatePeakSunHoursHPerDay(solar.planeOfArrayIrradiationKWhPerM2PerDay);
    const designPeakSunHoursHPerDay = pshValue === undefined ? blocked(blockedBy.get('designPeakSunHoursHPerDay') ?? ['AIO_MISSING_SOLAR_RESOURCE']) : available('designPeakSunHoursHPerDay', pshValue, 'h/day', 'CALC-AIO-003', { 'solarDesignResource.planeOfArrayIrradiationKWhPerM2PerDay': solar!.planeOfArrayIrradiationKWhPerM2PerDay });

    const pvPerformanceRatio = input.assumptions.pvPerformanceRatio;
    if (pvPerformanceRatio === undefined) block('AIO_MISSING_PV_PERFORMANCE_RATIO', ['minimumPvStcPowerW'], 'PV performance ratio is required', 'assumptions.pvPerformanceRatio');
    if (pvPerformanceRatio !== undefined && !hasAssumptionSource('pvPerformanceRatio')) block('AIO_MISSING_ASSUMPTION_SOURCE', ['minimumPvStcPowerW'], 'PV performance ratio must have declared provenance', 'assumptions.assumptionSources');
    const minimumPvStcPowerW = dailyDcValue === undefined || pshValue === undefined || pvPerformanceRatio === undefined
      ? blocked(blockedBy.get('minimumPvStcPowerW') ?? ['AIO_MISSING_PV_PERFORMANCE_RATIO'])
      : available('minimumPvStcPowerW', calculateMinimumPvStcPowerW(dailyDcValue, pshValue, pvPerformanceRatio), 'W', 'CALC-AIO-004', { 'output.dailyDcEnergyWh': dailyDcValue, 'output.designPeakSunHoursHPerDay': pshValue, 'assumptions.pvPerformanceRatio': pvPerformanceRatio });

    const autonomyDays = input.assumptions.autonomyDays;
    if (autonomyDays === undefined) block('AIO_MISSING_AUTONOMY_DAYS', ['minimumUsableStorageWh', ...nominalStorageOutputs], 'Autonomy days are required', 'assumptions.autonomyDays');
    if (autonomyDays !== undefined && !hasAssumptionSource('autonomyDays')) block('AIO_MISSING_ASSUMPTION_SOURCE', ['minimumUsableStorageWh', ...nominalStorageOutputs], 'Autonomy days must have declared provenance', 'assumptions.assumptionSources');
    const usableStorageValue = dailyDcValue === undefined || autonomyDays === undefined ? undefined : calculateMinimumUsableStorageWh(dailyDcValue, autonomyDays);
    const minimumUsableStorageWh = usableStorageValue === undefined ? blocked(blockedBy.get('minimumUsableStorageWh') ?? ['AIO_MISSING_AUTONOMY_DAYS']) : available('minimumUsableStorageWh', usableStorageValue, 'Wh', 'CALC-AIO-005', { 'output.dailyDcEnergyWh': dailyDcValue!, 'assumptions.autonomyDays': autonomyDays! });

    if (input.assumptions.batteryChemistry !== 'lead-acid') block('AIO_UNSUPPORTED_BATTERY_CHEMISTRY', nominalStorageOutputs, 'Nominal capacity is only defined for declared lead-acid batteries in AIO v1', 'assumptions.batteryChemistry');
    const dod = input.assumptions.depthOfDischargeRatio;
    const dischargeEfficiency = input.assumptions.batteryDischargeEfficiencyRatio;
    const voltage = input.assumptions.batteryNominalVoltageV;
    if (input.assumptions.batteryChemistry === 'lead-acid' && (dod === undefined || dischargeEfficiency === undefined) && !constraints.some((item) => item.code === 'AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION')) {
      block('AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION', nominalStorageOutputs, 'Lead-acid DoD and discharge efficiency are required for nominal storage', 'assumptions');
    }
    if (input.assumptions.batteryChemistry === 'lead-acid' && voltage === undefined && !constraints.some((item) => item.code === 'AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION')) {
      block('AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION', nominalCapacityOutputs, 'Nominal voltage is required for capacity in Ah', 'assumptions.batteryNominalVoltageV');
    }
    if (input.assumptions.batteryChemistry === 'lead-acid' && ['batteryChemistry', 'depthOfDischargeRatio', 'batteryDischargeEfficiencyRatio'].some((id) => !hasAssumptionSource(id))) {
      block('AIO_MISSING_ASSUMPTION_SOURCE', nominalStorageOutputs, 'Lead-acid nominal storage assumptions must have declared provenance', 'assumptions.assumptionSources');
    }
    if (input.assumptions.batteryChemistry === 'lead-acid' && !hasAssumptionSource('batteryNominalVoltageV')) {
      block('AIO_MISSING_ASSUMPTION_SOURCE', nominalCapacityOutputs, 'Lead-acid nominal voltage must have declared provenance', 'assumptions.assumptionSources');
    }
    const nominalStorageValue = usableStorageValue === undefined || dod === undefined || dischargeEfficiency === undefined || input.assumptions.batteryChemistry !== 'lead-acid'
      ? undefined : calculateLeadAcidNominalStorageWh(usableStorageValue, dod, dischargeEfficiency);
    const minimumLeadAcidNominalStorageWh = nominalStorageValue === undefined ? blocked(blockedBy.get('minimumLeadAcidNominalStorageWh') ?? ['AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION']) : available('minimumLeadAcidNominalStorageWh', nominalStorageValue, 'Wh', 'CALC-AIO-006', { 'output.minimumUsableStorageWh': usableStorageValue!, 'assumptions.depthOfDischargeRatio': dod!, 'assumptions.batteryDischargeEfficiencyRatio': dischargeEfficiency! });
    const minimumLeadAcidNominalCapacityAh = nominalStorageValue === undefined || voltage === undefined ? blocked(blockedBy.get('minimumLeadAcidNominalCapacityAh') ?? ['AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION']) : available('minimumLeadAcidNominalCapacityAh', calculateLeadAcidNominalCapacityAh(nominalStorageValue, voltage), 'Ah', 'CALC-AIO-006', { 'output.minimumLeadAcidNominalStorageWh': nominalStorageValue, 'assumptions.batteryNominalVoltageV': voltage });

    return this.envelope(identityInput, { dailyAcEnergyWh, peakCoincidentAcPowerW, dailyDcEnergyWh, designPeakSunHoursHPerDay, minimumPvStcPowerW, minimumUsableStorageWh, minimumLeadAcidNominalStorageWh, minimumLeadAcidNominalCapacityAh, minimumInverterContinuousAcPowerW, minimumInverterSurgeAcPowerW }, constraints, warnings, traces, canonicalInput);
  }

  private constraint(code: string, message: string, path: string, blocksOutputIds: readonly AioOutputId[]): ConstraintViolationV1 {
    return { code, severity: 'error', message, path, sourceId: 'AIO-001', blocksOutputIds };
  }

  private envelope(input: unknown, output: AioSizingOutputV1, violatedConstraints: readonly ConstraintViolationV1[], warnings: readonly EngineWarningV1[], trace: readonly FormulaTraceV1[], canonicalInput: boolean): AioSizingEnvelopeV1 {
    const issues: CalculationIssue[] = [...violatedConstraints, ...warnings.map((warning) => ({ code: warning.code, severity: 'warning' as const, message: warning.message, sourceId: 'AIO-001' }))];
    return {
      contractVersion: 1,
      engineVersion: this.version,
      inputHash: canonicalInput ? hashTechnicalInput(input) : hashDiagnosticInput(input),
      provenance: extractValidProvenance(input),
      output,
      warnings,
      violatedConstraints,
      issues,
      trace,
    };
  }
}

function blocked(constraintIds: readonly string[]): AioOutputValue { return { status: 'blocked', constraintIds }; }

function extractValidProvenance(input: unknown): readonly Provenance[] {
  if (!isRecord(input)) return [];
  const candidates: unknown[] = [];
  if (Array.isArray(input['provenance'])) candidates.push(...input['provenance']);
  const solar = input['solarDesignResource'];
  if (isRecord(solar)) candidates.push(solar['provenance']);
  const assumptions = input['assumptions'];
  if (isRecord(assumptions) && Array.isArray(assumptions['assumptionSources'])) {
    for (const source of assumptions['assumptionSources']) if (isRecord(source)) candidates.push(source['provenance']);
  }
  const valid = candidates.flatMap((candidate) => {
    const parsed = provenanceSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  });
  return valid.filter((item, index) => valid.findIndex((candidate) => provenanceKey(candidate) === provenanceKey(item)) === index);
}

function provenanceKey(item: Provenance): string {
  return [item.sourceId, item.sourceRecordId, item.sourceSha256, item.transformationVersion].join('\u0000');
}

function recoverBoundaryInput(input: unknown): BoundaryRecovery | undefined {
  if (!isRecord(input)) return undefined;
  const allowedTopLevel = new Set(['schemaVersion', 'technicalContext', 'load', 'solarDesignResource', 'assumptions', 'provenance']);
  if (Object.keys(input).some((key) => !allowedTopLevel.has(key)) || input['schemaVersion'] !== 1) return undefined;
  const allowedLoad = new Set(['basis', 'intervalMinutes', 'timezoneIana', 'hourlyEnergyWh', 'startupEvents', 'derivation']);
  const allowedAssumptions = new Set(['inverterEfficiencyRatio', 'pvPerformanceRatio', 'autonomyDays', 'batteryChemistry', 'depthOfDischargeRatio', 'batteryDischargeEfficiencyRatio', 'batteryNominalVoltageV', 'assumptionSources']);
  if (isRecord(input['load']) && Object.keys(input['load']).some((key) => !allowedLoad.has(key))) return undefined;
  if (isRecord(input['assumptions']) && Object.keys(input['assumptions']).some((key) => !allowedAssumptions.has(key))) return undefined;

  const violations: RecoverableBoundaryViolation[] = [];
  const add = (code: string, message: string, path: string, outputIds: readonly AioOutputId[]) => {
    if (!violations.some((item) => item.code === code && item.path === path)) violations.push({ code, message, path, outputIds });
  };

  const technical = recoverTechnicalContext(input['technicalContext'], add);
  const load = recoverLoad(input['load'], add);
  const assumptions = recoverAssumptions(input['assumptions'], add);

  let solar: unknown = input['solarDesignResource'];
  if (solar !== undefined) {
    const parsedSolar = solarDesignResourceV1Schema.safeParse(solar);
    if (!parsedSolar.success) {
      if (containsInvalidProvenance(solar)) add('AIO_INVALID_PROVENANCE', 'Invalid provenance prevents auditable calculation', 'solarDesignResource.provenance', allOutputs);
      add('AIO_INVALID_SOLAR_RESOURCE', 'Solar design resource is invalid and cannot be substituted', 'solarDesignResource', solarOutputs);
      solar = undefined;
    } else {
      solar = parsedSolar.data;
    }
  }

  const originalProvenance = input['provenance'];
  const validProvenance = Array.isArray(originalProvenance)
    ? originalProvenance.flatMap((item) => {
      const parsed = provenanceSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
    : [];
  if (!Array.isArray(originalProvenance) || validProvenance.length !== originalProvenance.length || validProvenance.length === 0) {
    add('AIO_INVALID_PROVENANCE', 'Invalid provenance prevents auditable calculation', 'provenance', allOutputs);
  }

  return {
    input: {
      schemaVersion: 1,
      technicalContext: technical,
      load,
      ...(solar === undefined ? {} : { solarDesignResource: solar }),
      assumptions,
      provenance: validProvenance.length === 0 ? [recoveryProvenance] : validProvenance,
    },
    violations,
  };
}

function recoverTechnicalContext(value: unknown, add: AddViolation): AioSizingRequestV1['technicalContext'] {
  const record = isRecord(value) ? value : {};
  const allowedContext = new Set(['applicationType', 'site']);
  if (Object.keys(record).some((key) => !allowedContext.has(key))) add('AIO_INVALID_TECHNICAL_CONTEXT', 'Unknown technical context fields were excluded from the calculation', 'technicalContext', []);
  const applicationTypes = ['residential', 'commercial', 'industrial', 'agricultural', 'other'] as const;
  const applicationType = applicationTypes.includes(record['applicationType'] as typeof applicationTypes[number])
    ? record['applicationType'] as typeof applicationTypes[number]
    : 'other';
  if (applicationType !== record['applicationType']) add('AIO_INVALID_TECHNICAL_CONTEXT', 'Invalid application type was excluded from the technical calculation', 'technicalContext.applicationType', []);
  const originalSite = isRecord(record['site']) ? record['site'] : {};
  if (!isRecord(record['site'])) add('AIO_INVALID_TECHNICAL_CONTEXT', 'Invalid site context was excluded from the technical calculation', 'technicalContext.site', []);
  const allowedSite = new Set(['localityId', 'latitudeDeg', 'longitudeDeg', 'arrayTiltDeg', 'arrayAzimuthDeg']);
  if (Object.keys(originalSite).some((key) => !allowedSite.has(key))) add('AIO_INVALID_TECHNICAL_CONTEXT', 'Unknown site context fields were excluded from the calculation', 'technicalContext.site', []);
  const site: Record<string, unknown> = {};
  copyOptionalString(originalSite, site, 'localityId', add, []);
  copyOptionalNumber(originalSite, site, 'latitudeDeg', (number) => number >= -90 && number <= 90, add, []);
  copyOptionalNumber(originalSite, site, 'longitudeDeg', (number) => number >= -180 && number <= 180, add, []);
  copyOptionalNumber(originalSite, site, 'arrayTiltDeg', (number) => number >= 0 && number <= 90, add, solarOutputs);
  copyOptionalNumber(originalSite, site, 'arrayAzimuthDeg', (number) => number >= 0 && number < 360, add, solarOutputs);
  return { applicationType, site } as AioSizingRequestV1['technicalContext'];
}

function recoverLoad(value: unknown, add: AddViolation): AioSizingRequestV1['load'] {
  if (isRecord(value)) {
    const startupEvents = Array.isArray(value['startupEvents'])
      ? value['startupEvents'].flatMap((event) => {
        const parsed = startupEventV1Schema.safeParse(event);
        if (parsed.success) return [parsed.data];
        add('AIO_INVALID_STARTUP_EVENT', 'Invalid startup event was excluded from surge sizing', 'load.startupEvents', ['minimumInverterSurgeAcPowerW']);
        return [];
      })
      : [];
    if (!Array.isArray(value['startupEvents'])) add('AIO_INVALID_STARTUP_EVENT', 'Invalid startup events were excluded from surge sizing', 'load.startupEvents', ['minimumInverterSurgeAcPowerW']);
    const candidate = { ...value, startupEvents };
    const parsedCandidate = aioSizingRequestV1Schema.shape.load.safeParse(candidate);
    if (parsedCandidate.success) return parsedCandidate.data;
  }
  add('AIO_INVALID_HOURLY_SERIES', 'The canonical 24-hour load series is invalid and cannot be substituted', 'load.hourlyEnergyWh', loadDerivedOutputs);
  return { basis: 'direct-hourly-power', intervalMinutes: 60, timezoneIana: 'Africa/Lome', hourlyEnergyWh: Array(24).fill(0), startupEvents: [] };
}

function recoverAssumptions(value: unknown, add: AddViolation): AioSizingRequestV1['assumptions'] {
  const record = isRecord(value) ? value : {};
  const candidate: Record<string, unknown> = { assumptionSources: [] };
  const dependencies: Readonly<Record<string, readonly AioOutputId[]>> = {
    inverterEfficiencyRatio: ['dailyDcEnergyWh', 'minimumPvStcPowerW', 'minimumUsableStorageWh', ...nominalStorageOutputs],
    pvPerformanceRatio: ['minimumPvStcPowerW'],
    autonomyDays: ['minimumUsableStorageWh', ...nominalStorageOutputs],
    depthOfDischargeRatio: nominalStorageOutputs,
    batteryDischargeEfficiencyRatio: nominalStorageOutputs,
    batteryNominalVoltageV: nominalCapacityOutputs,
  };
  const codes: Readonly<Record<string, string>> = {
    inverterEfficiencyRatio: 'AIO_MISSING_INVERTER_EFFICIENCY',
    pvPerformanceRatio: 'AIO_MISSING_PV_PERFORMANCE_RATIO',
    autonomyDays: 'AIO_MISSING_AUTONOMY_DAYS',
    depthOfDischargeRatio: 'AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION',
    batteryDischargeEfficiencyRatio: 'AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION',
    batteryNominalVoltageV: 'AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION',
  };
  for (const field of Object.keys(dependencies)) {
    if (record[field] === undefined) continue;
    const single = { batteryChemistry: 'unknown', assumptionSources: [], [field]: record[field] };
    const parsed = aioSizingRequestV1Schema.shape.assumptions.safeParse(single);
    if (parsed.success) candidate[field] = record[field];
    else add(codes[field]!, `${field} is invalid and cannot be substituted`, `assumptions.${field}`, dependencies[field]!);
  }
  const chemistry = record['batteryChemistry'];
  if (chemistry === 'lead-acid' || chemistry === 'other' || chemistry === 'unknown') candidate['batteryChemistry'] = chemistry;
  else {
    candidate['batteryChemistry'] = 'unknown';
    add('AIO_UNSUPPORTED_BATTERY_CHEMISTRY', 'Invalid battery chemistry cannot define lead-acid nominal capacity', 'assumptions.batteryChemistry', nominalStorageOutputs);
  }
  const sources = Array.isArray(record['assumptionSources']) ? record['assumptionSources'] : [];
  candidate['assumptionSources'] = sources.flatMap((source) => {
    const parsed = assumptionSourceV1Schema.safeParse(source);
    if (parsed.success) return [parsed.data];
    if (containsInvalidProvenance(source)) add('AIO_INVALID_PROVENANCE', 'Invalid provenance prevents auditable calculation', 'assumptions.assumptionSources.provenance', allOutputs);
    return [];
  });
  return aioSizingRequestV1Schema.shape.assumptions.parse(candidate);
}

type AddViolation = (code: string, message: string, path: string, outputIds: readonly AioOutputId[]) => void;

function copyOptionalString(source: Record<string, unknown>, target: Record<string, unknown>, field: string, add: AddViolation, outputIds: readonly AioOutputId[]): void {
  const value = source[field];
  if (value === undefined) return;
  if (typeof value === 'string' && value.length > 0) target[field] = value;
  else add('AIO_INVALID_TECHNICAL_CONTEXT', `${field} is invalid and was excluded from the technical calculation`, `technicalContext.site.${field}`, outputIds);
}

function copyOptionalNumber(source: Record<string, unknown>, target: Record<string, unknown>, field: string, valid: (value: number) => boolean, add: AddViolation, outputIds: readonly AioOutputId[]): void {
  const value = source[field];
  if (value === undefined) return;
  if (typeof value === 'number' && Number.isFinite(value) && valid(value)) target[field] = value;
  else add('AIO_INVALID_TECHNICAL_CONTEXT', `${field} is invalid and was excluded from the technical calculation`, `technicalContext.site.${field}`, outputIds);
}

function containsInvalidProvenance(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if ('provenance' in value) return !provenanceSchema.safeParse(value['provenance']).success;
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
