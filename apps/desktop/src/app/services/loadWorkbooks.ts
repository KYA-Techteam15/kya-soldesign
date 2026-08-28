import * as XLSX from 'xlsx';
import { defaultOperatingFractions } from '@ksd/engine';

export interface WorkbookCellIssue {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly sheetName: string;
  readonly rowNumber: number;
  readonly columnName: string;
  readonly cellAddress: string;
  readonly receivedValue: unknown;
  readonly message: string;
}

export type WorkbookInspection<T> =
  | { readonly status: 'valid'; readonly candidate: T; readonly warnings: readonly WorkbookCellIssue[] }
  | { readonly status: 'invalid'; readonly issues: readonly WorkbookCellIssue[] };

export interface EquipmentWorkbookRow {
  readonly id: string;
  readonly label: string;
  readonly quantity: number;
  readonly usefulPowerW: number;
  readonly efficiencyRatio: number;
  readonly startupPowerMultiplier: number | null;
  readonly durationHours: number;
  readonly hourlyOperatingFractions: readonly (number | null)[];
}

export interface HourlyWorkbookPoint {
  readonly hourIndex: number;
  readonly activePowerKw: number;
  readonly peakPowerKw: number | null;
}

const EQUIPMENT_COLUMNS = ['id', 'label', 'quantity', 'useful_power_w', 'efficiency_ratio', 'startup_power_multiplier', 'duration_hours', ...Array.from({ length: 24 }, (_, hour) => `h${String(hour).padStart(2, '0')}`)];
const HOURLY_COLUMNS = ['hour', 'average_power_kw', 'peak_power_kw'];

export function exportEquipmentWorkbook(rows: readonly EquipmentWorkbookRow[]): Uint8Array {
  const data = [EQUIPMENT_COLUMNS, ...rows.map((row) => [
    row.id, row.label, row.quantity, row.usefulPowerW, row.efficiencyRatio,
    row.startupPowerMultiplier, row.durationHours, ...row.hourlyOperatingFractions,
  ])];
  return writeWorkbook('equipements', data);
}

export function inspectEquipmentWorkbook(buffer: ArrayBuffer | Uint8Array): WorkbookInspection<EquipmentWorkbookRow[]> {
  const parsed = parseFirstSheet(buffer);
  if (!parsed.ok) return { status: 'invalid', issues: parsed.issues };
  const issues: WorkbookCellIssue[] = [];
  const headers = normalizeHeaders(parsed.rows[0] ?? []);
  const index = new Map(headers.map((header, column) => [header, column]));
  for (const required of ['id', 'label', 'quantity', 'useful_power_w', 'efficiency_ratio', 'duration_hours']) {
    if (!index.has(required)) issues.push(cellIssue('COLUMN_MISSING', parsed.sheetName, 1, required, required, undefined, `Colonne ${required} obligatoire`));
  }
  if (issues.length > 0) return { status: 'invalid', issues };
  const rows: EquipmentWorkbookRow[] = [];
  for (let rowIndex = 1; rowIndex < parsed.rows.length; rowIndex += 1) {
    const row = parsed.rows[rowIndex] ?? [];
    if (row.every((value) => blank(value))) continue;
    const get = (name: string): unknown => row[index.get(name) ?? -1];
    const id = text(get('id'));
    const label = text(get('label'));
    const quantity = number(get('quantity'));
    const usefulPowerW = number(get('useful_power_w'));
    const efficiencyRatio = number(get('efficiency_ratio'));
    const startupValue = blank(get('startup_power_multiplier')) ? null : number(get('startup_power_multiplier'));
    const durationHours = number(get('duration_hours'));
    const rowIssues: WorkbookCellIssue[] = [];
    if (!id) rowIssues.push(cellIssue('VALUE_REQUIRED', parsed.sheetName, rowIndex + 1, 'id', 'id', get('id'), 'Identifiant obligatoire'));
    if (!label) rowIssues.push(cellIssue('VALUE_REQUIRED', parsed.sheetName, rowIndex + 1, 'label', 'label', get('label'), 'Libellé obligatoire'));
    if (!Number.isInteger(quantity) || quantity < 1) rowIssues.push(cellIssue('RANGE_INVALID', parsed.sheetName, rowIndex + 1, 'quantity', 'quantity', get('quantity'), 'Entier >= 1 attendu'));
    if (!Number.isFinite(usefulPowerW) || usefulPowerW < 0) rowIssues.push(cellIssue('RANGE_INVALID', parsed.sheetName, rowIndex + 1, 'useful_power_w', 'useful_power_w', get('useful_power_w'), 'Nombre >= 0 attendu'));
    if (!Number.isFinite(efficiencyRatio) || efficiencyRatio <= 0 || efficiencyRatio > 1) rowIssues.push(cellIssue('RANGE_INVALID', parsed.sheetName, rowIndex + 1, 'efficiency_ratio', 'efficiency_ratio', get('efficiency_ratio'), 'Nombre strictement positif et <= 1 attendu'));
    if (startupValue !== null && (!Number.isFinite(startupValue) || startupValue <= 1)) rowIssues.push(cellIssue('RANGE_INVALID', parsed.sheetName, rowIndex + 1, 'startup_power_multiplier', 'startup_power_multiplier', get('startup_power_multiplier'), 'Vide ou nombre > 1 attendu'));
    if (!Number.isFinite(durationHours) || durationHours < 0 || durationHours > 24) rowIssues.push(cellIssue('RANGE_INVALID', parsed.sheetName, rowIndex + 1, 'duration_hours', 'duration_hours', get('duration_hours'), 'Nombre entre 0 et 24 attendu'));
    const hours = EQUIPMENT_COLUMNS.slice(7).map((name) => get(name));
    const allBlank = hours.every(blank);
    let fractions: number[];
    if (allBlank && Number.isFinite(durationHours)) {
      fractions = defaultOperatingFractions(durationHours);
    } else {
      if (hours.some(blank)) rowIssues.push(cellIssue('HOURS_PARTIAL', parsed.sheetName, rowIndex + 1, 'h00', 'h00..h23', hours, 'Les 24 heures doivent être toutes renseignées ou toutes vides'));
      fractions = hours.map((value, hour) => {
        const parsedValue = number(value);
        if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 1) rowIssues.push(cellIssue('RANGE_INVALID', parsed.sheetName, rowIndex + 1, `h${String(hour).padStart(2, '0')}`, `h${String(hour).padStart(2, '0')}`, value, 'Fraction entre 0 et 1 attendue'));
        return parsedValue;
      });
    }
    if (rowIssues.length > 0) issues.push(...rowIssues);
    else rows.push({ id, label, quantity, usefulPowerW, efficiencyRatio, startupPowerMultiplier: startupValue, durationHours, hourlyOperatingFractions: fractions });
  }
  if (issues.length > 0) return { status: 'invalid', issues };
  const warnings = parsed.rows.slice(1).some((row) => EQUIPMENT_COLUMNS.slice(7).every((name) => blank(row[index.get(name) ?? -1])))
    ? [cellIssue('HOURS_DEFAULTED', parsed.sheetName, 0, 'h00', 'h00..h23', undefined, 'Les heures vides ont reçu le profil horaire déterministe par défaut', 'warning')]
    : [];
  return { status: 'valid', candidate: rows, warnings };
}

export function exportHourlyProfileWorkbook(points: readonly HourlyWorkbookPoint[]): Uint8Array {
  return writeWorkbook('profil_horaire', [HOURLY_COLUMNS, ...points.map((point) => [point.hourIndex, point.activePowerKw, point.peakPowerKw])]);
}

export function inspectHourlyProfileWorkbook(buffer: ArrayBuffer | Uint8Array): WorkbookInspection<HourlyWorkbookPoint[]> {
  const parsed = parseFirstSheet(buffer);
  if (!parsed.ok) return { status: 'invalid', issues: parsed.issues };
  const issues: WorkbookCellIssue[] = [];
  const headers = normalizeHeaders(parsed.rows[0] ?? []);
  const aliases: Record<string, string[]> = {
    hour: ['hour', 'heure'], average_power_kw: ['average_power_kw', 'puissance_moyenne_kw', 'moyenne_kw'], peak_power_kw: ['peak_power_kw', 'puissance_pointe_kw', 'pointe_kw'],
  };
  const index = new Map<string, number>();
  for (const [canonical, names] of Object.entries(aliases)) {
    const found = names.map((name) => headers.indexOf(name)).find((candidate) => candidate >= 0);
    if (found === undefined) issues.push(cellIssue('COLUMN_MISSING', parsed.sheetName, 1, canonical, canonical, undefined, `Colonne ${canonical} obligatoire`));
    else index.set(canonical, found);
  }
  if (issues.length > 0) return { status: 'invalid', issues };
  const points: HourlyWorkbookPoint[] = [];
  for (let rowIndex = 1; rowIndex < parsed.rows.length; rowIndex += 1) {
    const row = parsed.rows[rowIndex] ?? [];
    if (row.every(blank)) continue;
    const hour = number(row[index.get('hour')!]);
    const activePowerKw = number(row[index.get('average_power_kw')!]);
    const peakCell = row[index.get('peak_power_kw')!];
    const peakPowerKw = blank(peakCell) ? null : number(peakCell);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) issues.push(cellIssue('HOUR_INVALID', parsed.sheetName, rowIndex + 1, 'hour', 'hour', row[index.get('hour')!], 'Entier de 0 à 23 attendu'));
    if (!Number.isFinite(activePowerKw) || activePowerKw < 0) issues.push(cellIssue('RANGE_INVALID', parsed.sheetName, rowIndex + 1, 'average_power_kw', 'average_power_kw', row[index.get('average_power_kw')!], 'Nombre >= 0 attendu'));
    if (peakPowerKw !== null && (!Number.isFinite(peakPowerKw) || peakPowerKw < activePowerKw)) issues.push(cellIssue('PEAK_BELOW_AVERAGE', parsed.sheetName, rowIndex + 1, 'peak_power_kw', 'peak_power_kw', peakCell, 'La pointe doit être >= à la moyenne'));
    points.push({ hourIndex: hour, activePowerKw, peakPowerKw });
  }
  if (points.length !== 24) issues.push(cellIssue('HOURS_COUNT_INVALID', parsed.sheetName, 0, 'hour', 'hour', points.length, '24 heures uniques sont obligatoires'));
  if (new Set(points.map((point) => point.hourIndex)).size !== points.length) issues.push(cellIssue('HOUR_DUPLICATE', parsed.sheetName, 0, 'hour', 'hour', points.map((point) => point.hourIndex), 'Chaque heure doit être unique'));
  if (issues.length > 0) return { status: 'invalid', issues };
  const warnings = points.some((point) => point.peakPowerKw === null)
    ? [cellIssue('PEAK_DEFAULTED', parsed.sheetName, 0, 'peak_power_kw', 'peak_power_kw', undefined, 'Les pointes vides seront normalisées à la puissance moyenne', 'warning')]
    : [];
  return { status: 'valid', candidate: points.sort((left, right) => left.hourIndex - right.hourIndex), warnings };
}

function writeWorkbook(sheetName: string, data: readonly (readonly unknown[])[]): Uint8Array {
  const sheet = XLSX.utils.aoa_to_sheet(data as unknown[][]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  return XLSX.write(book, { bookType: 'xlsx', type: 'array' });
}

function parseFirstSheet(buffer: ArrayBuffer | Uint8Array): { readonly ok: true; readonly sheetName: string; readonly rows: unknown[][] } | { readonly ok: false; readonly issues: readonly WorkbookCellIssue[] } {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellText: false, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { ok: false, issues: [cellIssue('SHEET_MISSING', '', 0, '', '', undefined, 'Une feuille est obligatoire')] };
    return { ok: true, sheetName, rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName]!, { header: 1, raw: true, defval: null }) };
  } catch (error) {
    return { ok: false, issues: [cellIssue('WORKBOOK_INVALID', '', 0, '', '', error instanceof Error ? error.message : displayValue(error), 'Le classeur Excel est illisible')] };
  }
}

function normalizeHeaders(row: readonly unknown[]): string[] { return row.map((value) => displayValue(value).trim().toLocaleLowerCase().normalize('NFKC').replace(/\s+/gu, '_')); }
function text(value: unknown): string { return displayValue(value).trim(); }
function number(value: unknown): number { return typeof value === 'number' ? value : Number(text(value).replace(/\s/gu, '').replace(',', '.')); }
function blank(value: unknown): boolean { return value === null || value === undefined || displayValue(value).trim() === ''; }
function displayValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) return String(value ?? '');
  try { return JSON.stringify(value); } catch { return '[valeur illisible]'; }
}
function cellIssue(code: string, sheetName: string, rowNumber: number, columnName: string, cellAddress: string, receivedValue: unknown, message: string, severity: 'error' | 'warning' = 'error'): WorkbookCellIssue { return { severity, code, sheetName, rowNumber, columnName, cellAddress, receivedValue, message }; }
