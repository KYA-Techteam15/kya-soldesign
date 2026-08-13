import {
  aioSizingRequestV1Schema,
  type AioSizingRequestV1,
  type CalculationIssue,
  type SystemKind,
} from '@ksd/domain';
import { calculateDailyDcEnergyWh, calculateMinimumPvStcPowerW, calculatePeakSunHoursHPerDay } from './calculations/energy-pv.js';
import { summarizeDailyLoad } from './calculations/load.js';
import { calculateInverterSurgeAcPowerW, calculateLeadAcidNominalCapacityAh, calculateLeadAcidNominalStorageWh, calculateMinimumUsableStorageWh } from './calculations/storage-inverter.js';
import type { AioCalculationRequestV1, AioOutputId, AioOutputValue, AioSizingEngineV1, AioSizingEnvelopeV1, AioSizingOutputV1, AioUnit, ConstraintViolationV1, EngineWarningV1, FormulaTraceV1 } from './contracts.js';
import { hashTechnicalInput } from './inputHash.js';

interface RecoverableBoundaryViolation {
  readonly code: string;
  readonly message: string;
  readonly path: string;
  readonly outputIds: readonly AioOutputId[];
}

const allOutputs: readonly AioOutputId[] = [
  'dailyAcEnergyWh', 'peakCoincidentAcPowerW', 'dailyDcEnergyWh', 'designPeakSunHoursHPerDay', 'minimumPvStcPowerW',
  'minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh',
  'minimumInverterContinuousAcPowerW', 'minimumInverterSurgeAcPowerW',
];

const sourceByFormula: Readonly<Record<string, readonly string[]>> = {
  'CALC-AIO-001': ['SRC-AIO-003'],
  'CALC-AIO-002': ['SRC-AIO-002'],
  'CALC-AIO-003': ['SRC-AIO-002', 'SRC-AIO-003'],
  'CALC-AIO-004': ['SRC-AIO-001', 'SRC-AIO-002'],
  'CALC-AIO-005': ['SRC-AIO-002', 'SRC-AIO-004'],
  'CALC-AIO-006': ['SRC-AIO-001', 'SRC-AIO-005'],
  'CALC-AIO-007': ['SRC-AIO-004'],
};

export class AioSizingEngine implements AioSizingEngineV1 {
  public readonly version: string;

  public constructor(version = '1.0.0') { this.version = version; }

  public calculate(request: AioCalculationRequestV1): AioSizingEnvelopeV1 { return this.calculateSync(request); }

  public calculateSync(request: AioCalculationRequestV1): AioSizingEnvelopeV1 {
    if (request.system !== 'standalone-all-in-one') throw new RangeError(`AIO engine does not support ${request.system satisfies SystemKind}`);
    const parsed = aioSizingRequestV1Schema.safeParse(request.input);
    if (!parsed.success) {
      const recovery = recoverBoundaryInput(request.input, parsed.error.issues.map((issue) => issue.path.map(String)));
      if (recovery === undefined) return this.invalidEnvelope(request.input, parsed.error.issues.map((issue) => issue.path.join('.') || 'input'));
      const recovered = aioSizingRequestV1Schema.safeParse(recovery.input);
      if (!recovered.success) return this.invalidEnvelope(request.input, parsed.error.issues.map((issue) => issue.path.join('.') || 'input'));
      return this.validEnvelope(recovered.data, recovery.violations);
    }
    return this.validEnvelope(parsed.data);
  }

  private invalidEnvelope(input: unknown, paths: readonly string[]): AioSizingEnvelopeV1 {
    const constraint = this.constraint('AIO_INVALID_HOURLY_SERIES', 'AIO input does not satisfy its canonical contract', paths.join(', ') || 'input', allOutputs);
    const output = Object.fromEntries(allOutputs.map((id) => [id, blocked([constraint.code])])) as unknown as AioSizingOutputV1;
    return this.envelope(input, output, [constraint], [], []);
  }

  private validEnvelope(input: AioSizingRequestV1, boundaryViolations: readonly RecoverableBoundaryViolation[] = []): AioSizingEnvelopeV1 {
    const constraints: ConstraintViolationV1[] = [];
    const warnings: EngineWarningV1[] = [];
    const traces: FormulaTraceV1[] = [];
    const blockedBy = new Map<AioOutputId, string[]>();
    const block = (code: string, outputIds: readonly AioOutputId[], message: string, path: string) => {
      if (!constraints.some((violation) => violation.code === code && violation.path === path)) {
        constraints.push(this.constraint(code, message, path, outputIds));
      }
      for (const outputId of outputIds) {
        const codes = blockedBy.get(outputId) ?? [];
        blockedBy.set(outputId, codes.includes(code) ? codes : [...codes, code]);
      }
    };
    for (const violation of boundaryViolations) block(violation.code, violation.outputIds, violation.message, violation.path);
    const hasAssumptionSource = (assumptionId: string) => input.assumptions.assumptionSources.some((source) => source.assumptionId === assumptionId);
    const available = (outputId: AioOutputId, value: number, unit: AioUnit, formulaId: keyof typeof sourceByFormula, inputValues: Readonly<Record<string, number | string>>): AioOutputValue => {
      if (blockedBy.has(outputId)) return blocked(blockedBy.get(outputId)!);
      const traceId = `trace:${outputId}`;
      const sourceIds = sourceByFormula[formulaId]!;
      traces.push({ id: traceId, formulaId, sourceId: sourceIds[0]!, sourceIds, inputPaths: Object.keys(inputValues), outputPath: `output.${outputId}`, substitutedValues: inputValues });
      return { status: 'available', value, unit, traceIds: [traceId] };
    };

    const summary = summarizeDailyLoad(input.load.hourlyEnergyWh);
    if (summary.dailyAcEnergyWh === 0) warnings.push({ code: 'AIO_ZERO_LOAD', message: 'Daily AC load is zero; calculated minima are zero.' });
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
    if (inverterEfficiency === undefined) block('AIO_MISSING_INVERTER_EFFICIENCY', ['dailyDcEnergyWh', 'minimumPvStcPowerW', 'minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'], 'Inverter efficiency is required for DC energy and dependent outputs', 'assumptions.inverterEfficiencyRatio');
    if (inverterEfficiency !== undefined && !hasAssumptionSource('inverterEfficiencyRatio')) block('AIO_MISSING_ASSUMPTION_SOURCE', ['dailyDcEnergyWh', 'minimumPvStcPowerW', 'minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'], 'Inverter efficiency must have declared provenance', 'assumptions.assumptionSources');
    const dailyDcValue = inverterEfficiency === undefined ? undefined : calculateDailyDcEnergyWh(summary.dailyAcEnergyWh, inverterEfficiency);
    const dailyDcEnergyWh = dailyDcValue === undefined ? blocked(blockedBy.get('dailyDcEnergyWh')!) : available('dailyDcEnergyWh', dailyDcValue, 'Wh', 'CALC-AIO-002', { 'output.dailyAcEnergyWh': summary.dailyAcEnergyWh, 'assumptions.inverterEfficiencyRatio': inverterEfficiency! });

    if (input.solarDesignResource === undefined) block('AIO_MISSING_SOLAR_RESOURCE', ['designPeakSunHoursHPerDay', 'minimumPvStcPowerW'], 'A sourced plane-of-array solar resource is required', 'solarDesignResource');
    const site = input.technicalContext.site;
    const solar = input.solarDesignResource;
    const resourceOrientationMatches = solar !== undefined
      && site.arrayTiltDeg !== undefined && site.arrayAzimuthDeg !== undefined
      && site.arrayTiltDeg === solar.arrayTiltDeg && site.arrayAzimuthDeg === solar.arrayAzimuthDeg;
    if (solar !== undefined && !resourceOrientationMatches) {
      block('AIO_INVALID_SOLAR_RESOURCE', ['designPeakSunHoursHPerDay', 'minimumPvStcPowerW'], 'Plane-of-array resource orientation must match the declared technical site orientation', 'solarDesignResource.arrayTiltDeg');
    }
    const pshValue = solar === undefined || !resourceOrientationMatches ? undefined : calculatePeakSunHoursHPerDay(solar.planeOfArrayIrradiationKWhPerM2PerDay);
    const designPeakSunHoursHPerDay = pshValue === undefined ? blocked(blockedBy.get('designPeakSunHoursHPerDay')!) : available('designPeakSunHoursHPerDay', pshValue, 'h/day', 'CALC-AIO-003', { 'solarDesignResource.planeOfArrayIrradiationKWhPerM2PerDay': solar!.planeOfArrayIrradiationKWhPerM2PerDay });

    const pvPerformanceRatio = input.assumptions.pvPerformanceRatio;
    if (pvPerformanceRatio === undefined) block('AIO_MISSING_PV_PERFORMANCE_RATIO', ['minimumPvStcPowerW'], 'PV performance ratio is required', 'assumptions.pvPerformanceRatio');
    if (pvPerformanceRatio !== undefined && !hasAssumptionSource('pvPerformanceRatio')) block('AIO_MISSING_ASSUMPTION_SOURCE', ['minimumPvStcPowerW'], 'PV performance ratio must have declared provenance', 'assumptions.assumptionSources');
    const minimumPvStcPowerW = dailyDcValue === undefined || pshValue === undefined || pvPerformanceRatio === undefined
      ? blocked(blockedBy.get('minimumPvStcPowerW')!)
      : available('minimumPvStcPowerW', calculateMinimumPvStcPowerW(dailyDcValue, pshValue, pvPerformanceRatio), 'W', 'CALC-AIO-004', { 'output.dailyDcEnergyWh': dailyDcValue, 'output.designPeakSunHoursHPerDay': pshValue, 'assumptions.pvPerformanceRatio': pvPerformanceRatio! });

    const autonomyDays = input.assumptions.autonomyDays;
    if (autonomyDays === undefined) block('AIO_MISSING_AUTONOMY_DAYS', ['minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'], 'Autonomy days are required', 'assumptions.autonomyDays');
    if (autonomyDays !== undefined && !hasAssumptionSource('autonomyDays')) block('AIO_MISSING_ASSUMPTION_SOURCE', ['minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'], 'Autonomy days must have declared provenance', 'assumptions.assumptionSources');
    const usableStorageValue = dailyDcValue === undefined || autonomyDays === undefined ? undefined : calculateMinimumUsableStorageWh(dailyDcValue, autonomyDays);
    const minimumUsableStorageWh = usableStorageValue === undefined ? blocked(blockedBy.get('minimumUsableStorageWh')!) : available('minimumUsableStorageWh', usableStorageValue, 'Wh', 'CALC-AIO-005', { 'output.dailyDcEnergyWh': dailyDcValue!, 'assumptions.autonomyDays': autonomyDays! });

    if (input.assumptions.batteryChemistry !== 'lead-acid') block('AIO_UNSUPPORTED_BATTERY_CHEMISTRY', ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'], 'Nominal capacity is only defined for declared lead-acid batteries in AIO v1', 'assumptions.batteryChemistry');
    const dod = input.assumptions.depthOfDischargeRatio;
    const dischargeEfficiency = input.assumptions.batteryDischargeEfficiencyRatio;
    const voltage = input.assumptions.batteryNominalVoltageV;
    if (input.assumptions.batteryChemistry === 'lead-acid' && (dod === undefined || dischargeEfficiency === undefined || voltage === undefined)) {
      block('AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION', ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'], 'Lead-acid DoD, discharge efficiency and nominal voltage are required', 'assumptions');
    }
    if (input.assumptions.batteryChemistry === 'lead-acid' && ['batteryChemistry', 'depthOfDischargeRatio', 'batteryDischargeEfficiencyRatio', 'batteryNominalVoltageV'].some((id) => !hasAssumptionSource(id))) {
      block('AIO_MISSING_ASSUMPTION_SOURCE', ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh'], 'Lead-acid capacity assumptions must have declared provenance', 'assumptions.assumptionSources');
    }
    const nominalStorageValue = usableStorageValue === undefined || dod === undefined || dischargeEfficiency === undefined || input.assumptions.batteryChemistry !== 'lead-acid'
      ? undefined : calculateLeadAcidNominalStorageWh(usableStorageValue, dod, dischargeEfficiency);
    const minimumLeadAcidNominalStorageWh = nominalStorageValue === undefined ? blocked(blockedBy.get('minimumLeadAcidNominalStorageWh')!) : available('minimumLeadAcidNominalStorageWh', nominalStorageValue, 'Wh', 'CALC-AIO-006', { 'output.minimumUsableStorageWh': usableStorageValue!, 'assumptions.depthOfDischargeRatio': dod!, 'assumptions.batteryDischargeEfficiencyRatio': dischargeEfficiency! });
    const minimumLeadAcidNominalCapacityAh = nominalStorageValue === undefined || voltage === undefined ? blocked(blockedBy.get('minimumLeadAcidNominalCapacityAh')!) : available('minimumLeadAcidNominalCapacityAh', calculateLeadAcidNominalCapacityAh(nominalStorageValue, voltage), 'Ah', 'CALC-AIO-006', { 'output.minimumLeadAcidNominalStorageWh': nominalStorageValue, 'assumptions.batteryNominalVoltageV': voltage });

    return this.envelope(input, { dailyAcEnergyWh, peakCoincidentAcPowerW, dailyDcEnergyWh, designPeakSunHoursHPerDay, minimumPvStcPowerW, minimumUsableStorageWh, minimumLeadAcidNominalStorageWh, minimumLeadAcidNominalCapacityAh, minimumInverterContinuousAcPowerW, minimumInverterSurgeAcPowerW }, constraints, warnings, traces);
  }

  private constraint(code: string, message: string, path: string, blocksOutputIds: readonly AioOutputId[]): ConstraintViolationV1 {
    return { code, severity: 'error', message, path, sourceId: 'AIO-001', blocksOutputIds };
  }

  private envelope(input: unknown, output: AioSizingOutputV1, violatedConstraints: readonly ConstraintViolationV1[], warnings: readonly EngineWarningV1[], trace: readonly FormulaTraceV1[]): AioSizingEnvelopeV1 {
    const issues: CalculationIssue[] = [...violatedConstraints, ...warnings.map((warning) => ({ code: warning.code, severity: 'warning' as const, message: warning.message, sourceId: 'AIO-001' }))];
    const parsed = aioSizingRequestV1Schema.safeParse(input);
    const provenance = !parsed.success ? [] : deduplicateProvenance([
      ...parsed.data.provenance,
      ...(parsed.data.solarDesignResource === undefined ? [] : [parsed.data.solarDesignResource.provenance]),
      ...parsed.data.assumptions.assumptionSources.map((source) => source.provenance),
    ]);
    return { contractVersion: 1, engineVersion: this.version, inputHash: hashTechnicalInput(input), provenance, output, warnings, violatedConstraints, issues, trace };
  }
}

function blocked(constraintIds: readonly string[]): AioOutputValue { return { status: 'blocked', constraintIds }; }

function deduplicateProvenance<T extends { readonly sourceId: string; readonly sourceRecordId: string }>(items: readonly T[]): readonly T[] {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.sourceId === item.sourceId && candidate.sourceRecordId === item.sourceRecordId) === index);
}

function recoverBoundaryInput(input: unknown, issuePaths: readonly (readonly string[])[]): { readonly input: unknown; readonly violations: readonly RecoverableBoundaryViolation[] } | undefined {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const original = input as Record<string, unknown>;
  const candidate: Record<string, unknown> = { ...original };
  const originalAssumptions = original['assumptions'];
  if (originalAssumptions !== null && typeof originalAssumptions === 'object' && !Array.isArray(originalAssumptions)) {
    candidate['assumptions'] = { ...(originalAssumptions as Record<string, unknown>) };
  }
  const originalSolarResource = original['solarDesignResource'];
  if (originalSolarResource !== null && typeof originalSolarResource === 'object' && !Array.isArray(originalSolarResource)) {
    candidate['solarDesignResource'] = { ...(originalSolarResource as Record<string, unknown>) };
  }
  const assumptions = candidate['assumptions'] as Record<string, unknown> | undefined;
  const violations: RecoverableBoundaryViolation[] = [];
  const recoverAssumption = (field: string, code: string, outputIds: readonly AioOutputId[]) => {
    if (!issuePaths.some((path) => path.length === 2 && path[0] === 'assumptions' && path[1] === field)) return;
    if (assumptions === undefined) return;
    delete assumptions[field];
    violations.push({ code, message: `${field} is invalid and cannot be substituted`, path: `assumptions.${field}`, outputIds });
  };
  recoverAssumption('inverterEfficiencyRatio', 'AIO_MISSING_INVERTER_EFFICIENCY', ['dailyDcEnergyWh', 'minimumPvStcPowerW', 'minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']);
  recoverAssumption('pvPerformanceRatio', 'AIO_MISSING_PV_PERFORMANCE_RATIO', ['minimumPvStcPowerW']);
  recoverAssumption('autonomyDays', 'AIO_MISSING_AUTONOMY_DAYS', ['minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']);
  for (const field of ['depthOfDischargeRatio', 'batteryDischargeEfficiencyRatio', 'batteryNominalVoltageV']) {
    recoverAssumption(field, 'AIO_MISSING_LEAD_ACID_CAPACITY_ASSUMPTION', ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']);
  }
  if (issuePaths.some((path) => path[0] === 'solarDesignResource')) {
    delete candidate['solarDesignResource'];
    violations.push({ code: 'AIO_INVALID_SOLAR_RESOURCE', message: 'Solar design resource is invalid and cannot be substituted', path: 'solarDesignResource', outputIds: ['designPeakSunHoursHPerDay', 'minimumPvStcPowerW'] });
  }
  return violations.length === 0 ? undefined : { input: candidate, violations };
}
