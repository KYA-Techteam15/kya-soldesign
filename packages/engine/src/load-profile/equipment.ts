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
  const calledElectricalPowerW = installedUsefulPowerW / row.efficiencyRatio!;
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
    activePowerW: row.usefulPowerW * row.quantity / row.efficiencyRatio!,
    powerFactor: null,
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

/**
 * Puissance appelée heure par heure, démarrages compris : un démarrage inductif ajoute
 * P. en marche × (coefficient − 1) à l'heure où l'appareil démarre. Même règle pour le tableau
 * des besoins et pour le dimensionnement.
 */
export function hourlyPeakPowerWithStartupsW(
  hourlyMeanPowerW: readonly number[],
  startupEvents: readonly { readonly hourIndex: number; readonly runningPowerW: number; readonly startupPowerMultiplier: number | null }[],
): number[] {
  const peaks = [...hourlyMeanPowerW];
  for (const event of startupEvents) {
    if (event.startupPowerMultiplier === null) continue;
    peaks[event.hourIndex] = peaks[event.hourIndex]! + event.runningPowerW * (event.startupPowerMultiplier - 1);
  }
  return peaks;
}

/** Pointe au démarrage d'une liste d'appareils ; `null` si une ligne est incomplète. */
export function equipmentStartupPeakW(rows: readonly EquipmentScheduleRow[]): number | null {
  if (rows.length === 0) return 0;
  // La pointe ne dépend pas du fuseau : n'importe quel fuseau valide convient.
  const normalized = normalizeEquipmentRows({ timezoneIana: 'Etc/UTC', rows });
  if (normalized.status !== 'ready') return null;
  return Math.max(...hourlyPeakPowerWithStartupsW(normalized.load.hourlyEnergyWh, normalized.load.startupEvents));
}

function validateRow(row: EquipmentScheduleRow, index: number): readonly LoadInputIssue[] {
  const base = `rows.${index}`;
  const issues: LoadInputIssue[] = [];
  if (row.id.trim().length === 0) issues.push(issue('LOAD_ID_MISSING', `${base}.id`, 'A stable row identifier is required'));
  if (row.label.trim().length === 0) issues.push(issue('LOAD_LABEL_MISSING', `${base}.label`, 'Equipment name is required'));
  if (!Number.isInteger(row.quantity) || row.quantity <= 0) issues.push(issue('LOAD_QUANTITY_INVALID', `${base}.quantity`, 'Quantity must be a positive integer'));
  if (!Number.isFinite(row.usefulPowerW) || row.usefulPowerW < 0) issues.push(issue('LOAD_POWER_INVALID', `${base}.usefulPowerW`, 'Useful power must be finite and non-negative'));
  if (row.efficiencyRatio === null || !Number.isFinite(row.efficiencyRatio) || row.efficiencyRatio <= 0 || row.efficiencyRatio > 1) issues.push(issue('LOAD_EFFICIENCY_MISSING', `${base}.efficiencyRatio`, 'Efficiency must be explicitly declared in (0, 1]'));
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
