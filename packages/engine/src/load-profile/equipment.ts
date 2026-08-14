import { normalizeEquipmentScheduleToAioDailyLoad, type LoadItem, type StartupEventV1 } from '@ksd/domain';
import type { EquipmentScheduleRow, LoadInputIssue, Page1LoadNormalization } from './contracts.js';

export interface EquipmentRowSummary {
  readonly installedUsefulPowerW: number;
  readonly calledElectricalPowerW: number;
  readonly dailyEnergyWh: number;
}

export function summarizeEquipmentRow(row: EquipmentScheduleRow): EquipmentRowSummary | null {
  if (validateRow(row, 0).length > 0) return null;
  const installedUsefulPowerW = row.usefulPowerW * row.quantity;
  const calledElectricalPowerW = installedUsefulPowerW * row.simultaneityRatio! / row.efficiencyRatio!;
  return {
    installedUsefulPowerW,
    calledElectricalPowerW,
    dailyEnergyWh: calledElectricalPowerW * row.hourlyOperatingFractions.reduce((total, value) => total + value, 0),
  };
}

export function normalizeEquipmentRows(input: {
  readonly timezoneIana: string;
  readonly rows: readonly EquipmentScheduleRow[];
}): Page1LoadNormalization {
  const issues = input.rows.flatMap(validateRow);
  if (input.rows.length === 0) issues.push(issue('LOAD_EQUIPMENT_EMPTY', 'rows', 'At least one equipment row is required'));
  if (issues.length > 0) return { status: 'blocked', issues };

  const items: LoadItem[] = input.rows.map((row) => ({
    id: row.id,
    label: row.label,
    quantity: 1,
    activePowerW: row.usefulPowerW * row.quantity * row.simultaneityRatio! / row.efficiencyRatio!,
    powerFactor: null,
    simultaneityRatio: 1,
    hourlyOperatingFractions: [...row.hourlyOperatingFractions],
  }));
  const startupEvents = input.rows.flatMap((row, index) => startupEventsFor(row, items[index]!.activePowerW));
  try {
    return {
      status: 'ready',
      load: normalizeEquipmentScheduleToAioDailyLoad({ timezoneIana: input.timezoneIana, items, startupEvents }),
      warnings: [],
    };
  } catch (error) {
    return { status: 'blocked', issues: [issue('LOAD_EQUIPMENT_INVALID', 'rows', error instanceof Error ? error.message : 'Invalid equipment schedule')] };
  }
}

function validateRow(row: EquipmentScheduleRow, index: number): readonly LoadInputIssue[] {
  const base = `rows.${index}`;
  const issues: LoadInputIssue[] = [];
  if (row.id.trim().length === 0) issues.push(issue('LOAD_ID_MISSING', `${base}.id`, 'A stable row identifier is required'));
  if (row.label.trim().length === 0) issues.push(issue('LOAD_LABEL_MISSING', `${base}.label`, 'Equipment name is required'));
  if (!Number.isInteger(row.quantity) || row.quantity <= 0) issues.push(issue('LOAD_QUANTITY_INVALID', `${base}.quantity`, 'Quantity must be a positive integer'));
  if (!Number.isFinite(row.usefulPowerW) || row.usefulPowerW < 0) issues.push(issue('LOAD_POWER_INVALID', `${base}.usefulPowerW`, 'Useful power must be finite and non-negative'));
  if (row.efficiencyRatio === null || !Number.isFinite(row.efficiencyRatio) || row.efficiencyRatio <= 0 || row.efficiencyRatio > 1) issues.push(issue('LOAD_EFFICIENCY_MISSING', `${base}.efficiencyRatio`, 'Efficiency must be explicitly declared in (0, 1]'));
  if (row.simultaneityRatio === null || !Number.isFinite(row.simultaneityRatio) || row.simultaneityRatio < 0 || row.simultaneityRatio > 1) issues.push(issue('LOAD_SIMULTANEITY_MISSING', `${base}.simultaneityRatio`, 'Simultaneity must be explicitly declared in [0, 1]'));
  if (row.hourlyOperatingFractions.length !== 24 || row.hourlyOperatingFractions.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) issues.push(issue('LOAD_SCHEDULE_INVALID', `${base}.hourlyOperatingFractions`, 'The operating schedule must contain 24 fractions in [0, 1]'));
  if (row.startupPowerMultiplier !== null && (!Number.isFinite(row.startupPowerMultiplier) || row.startupPowerMultiplier <= 1)) issues.push(issue('LOAD_STARTUP_MULTIPLIER_INVALID', `${base}.startupPowerMultiplier`, 'An inductive multiplier must be greater than 1'));
  return issues;
}

function startupEventsFor(row: EquipmentScheduleRow, runningPowerW: number): readonly StartupEventV1[] {
  if (row.startupPowerMultiplier === null || runningPowerW <= 0) return [];
  const active = row.hourlyOperatingFractions.map((value) => value > 0);
  const starts = active.flatMap((isActive, hour) => isActive && !active[(hour + 23) % 24] ? [hour] : []);
  if (starts.length === 0 && active.every(Boolean)) starts.push(0);
  return starts.map((hourIndex) => ({
    hourIndex,
    runningPowerW,
    startupPowerMultiplier: row.startupPowerMultiplier,
    isInductive: true,
    sourceRef: row.id,
  }));
}

function issue(code: string, path: string, message: string): LoadInputIssue {
  return { code, path, message };
}
