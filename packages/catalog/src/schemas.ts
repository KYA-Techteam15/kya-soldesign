import { dataIssueSchema, provenanceSchema, type DataIssue } from '@ksd/domain';
import { z } from 'zod';

const nullablePositiveNumber = z.number().finite().positive().nullable();
const nullableRatioSchema = z.number().finite().min(0).max(1).nullable();

const baseEquipmentSchema = z.object({
  id: z.string().min(1),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  provenance: provenanceSchema,
}).strict();

export const pvModuleSchema = baseEquipmentSchema.extend({
  kind: z.literal('pv-module'),
  nominalPowerW: z.number().finite().positive(),
  voltageAtMaximumPowerV: z.number().finite().positive(),
  openCircuitVoltageV: z.number().finite().positive(),
  currentAtMaximumPowerA: z.number().finite().positive(),
  shortCircuitCurrentA: z.number().finite().positive(),
  technology: z.string().min(1).nullable(),
  areaM2: nullablePositiveNumber,
  temperatureCoefficientPmaxPerC: z.number().finite().nullable(),
  temperatureCoefficientVocPerC: z.number().finite().nullable(),
  nominalOperatingCellTemperatureC: nullablePositiveNumber,
}).strict();

export const batterySchema = baseEquipmentSchema.extend({
  kind: z.literal('battery'),
  nominalVoltageV: z.number().finite().positive(),
  nominalCapacityAh: z.number().finite().positive(),
  nominalEnergyWh: z.number().finite().positive(),
  usableDepthOfDischargeRatio: nullableRatioSchema,
  roundTripEfficiencyRatio: nullableRatioSchema,
  cycleLife: z.number().int().positive().nullable(),
  technology: z.string().min(1).nullable(),
}).strict();

export const inverterSchema = baseEquipmentSchema.extend({
  kind: z.literal('inverter'),
  nominalAcPowerW: z.number().finite().positive(),
  nominalDcVoltageV: z.number().finite().positive(),
  surgePowerW: nullablePositiveNumber,
  nominalAcVoltageV: nullablePositiveNumber,
  efficiencyRatio: nullableRatioSchema,
  pvArrayMaxPowerW: nullablePositiveNumber,
  mpptMinVoltageV: nullablePositiveNumber,
  mpptMaxVoltageV: nullablePositiveNumber,
  pvOpenCircuitMaxVoltageV: nullablePositiveNumber,
  pvInputsNumber: z.number().int().positive().nullable(),
  maxChargingCurrentA: nullablePositiveNumber,
  maxParallelUnits: z.number().int().positive().nullable(),
  canBeInParallel: z.boolean().nullable(),
  inverterType: z.string().min(1).nullable(),
}).strict();

export const equipmentSchema = z.discriminatedUnion('kind', [
  pvModuleSchema,
  batterySchema,
  inverterSchema,
]);

export type Equipment = z.infer<typeof equipmentSchema>;

export interface EquipmentValidationResult {
  readonly equipment: Equipment | null;
  readonly issues: readonly DataIssue[];
}

function schemaIssue(path: string, message: string): DataIssue {
  return dataIssueSchema.parse({
    code: 'CATALOG_SCHEMA_INVALID',
    severity: 'error',
    message,
    path,
  });
}

export function validateEquipment(value: unknown): EquipmentValidationResult {
  const parsed = equipmentSchema.safeParse(value);
  if (!parsed.success) {
    return {
      equipment: null,
      issues: parsed.error.issues.map((issue) => schemaIssue(issue.path.join('.'), issue.message)),
    };
  }

  const equipment = parsed.data;
  const issues: DataIssue[] = [];
  if (equipment.kind === 'pv-module' && equipment.voltageAtMaximumPowerV >= equipment.openCircuitVoltageV) {
    issues.push({
      code: 'PV_VOLTAGE_AT_MAXIMUM_POWER_NOT_BELOW_OPEN_CIRCUIT',
      severity: 'error',
      message: 'voltageAtMaximumPowerV must be below openCircuitVoltageV',
      path: 'voltageAtMaximumPowerV',
    });
  }
  if (equipment.kind === 'pv-module' && equipment.currentAtMaximumPowerA > equipment.shortCircuitCurrentA) {
    issues.push({
      code: 'PV_CURRENT_AT_MAXIMUM_POWER_ABOVE_SHORT_CIRCUIT',
      severity: 'error',
      message: 'currentAtMaximumPowerA must not exceed shortCircuitCurrentA',
      path: 'currentAtMaximumPowerA',
    });
  }
  if (equipment.kind === 'inverter' && equipment.surgePowerW !== null) {
    if (equipment.surgePowerW < equipment.nominalAcPowerW) {
      issues.push({
        code: 'INVERTER_SURGE_BELOW_NOMINAL',
        severity: 'error',
        message: 'surgePowerW must not be below nominalAcPowerW',
        path: 'surgePowerW',
      });
    }
    if (equipment.surgePowerW === equipment.nominalAcPowerW) {
      issues.push({
        code: 'INVERTER_SURGE_EQUALS_NOMINAL',
        severity: 'warning',
        message: 'surgePowerW equals nominalAcPowerW and does not establish overload capability',
        path: 'surgePowerW',
      });
    }
  }
  if (equipment.kind === 'inverter'
    && equipment.mpptMinVoltageV !== null
    && equipment.mpptMaxVoltageV !== null
    && equipment.mpptMinVoltageV > equipment.mpptMaxVoltageV) {
    issues.push({
      code: 'INVERTER_MPPT_RANGE_INVALID',
      severity: 'error',
      message: 'mpptMinVoltageV must not exceed mpptMaxVoltageV',
      path: 'mpptMinVoltageV',
    });
  }
  return { equipment, issues };
}

