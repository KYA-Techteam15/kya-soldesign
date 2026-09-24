import { inspectHourlyProfileWorkbook } from '../../../app/services/loadWorkbooks';

export interface HourlyImportPoint {
  readonly hour: number;
  readonly realPower: number;
  readonly peakPower: number | null;
}

export type HourlyImportResult =
  | { readonly status: 'ok'; readonly points: readonly HourlyImportPoint[] }
  | { readonly status: 'invalid'; readonly detail: string };

/**
 * Lit un profil horaire (Excel ou CSV) : 24 lignes pour une journée type, 8 760 pour une année.
 * Colonnes : heure ; moyenne kW ; pointe kW (facultative, « = moyenne » si vide). Une ligne
 * d'en-têtes est tolérée.
 */
export async function readHourlyFile(file: File): Promise<HourlyImportResult> {
  if (file.name.toLowerCase().endsWith('.csv')) return readCsv(await file.text());
  const result = inspectHourlyProfileWorkbook(await file.arrayBuffer());
  if (result.status === 'invalid') return { status: 'invalid', detail: result.issues.slice(0, 3).map((issue) => `${issue.cellAddress || issue.columnName}: ${issue.message}`).join(' · ') };
  return { status: 'ok', points: result.candidate.map((point) => ({ hour: point.hourIndex, realPower: point.activePowerKw, peakPower: point.peakPowerKw ?? null })) };
}

function readCsv(text: string): HourlyImportResult {
  const rows = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const columns = line.split(/[;,\t]/u).map((value) => value.trim().replace(',', '.'));
    const hour = Number(columns[0]);
    const mean = Number(columns[1]);
    const peak = columns[2] === undefined || columns[2] === '' ? null : Number(columns[2]);
    const valid = Number.isInteger(hour) && hour >= 0 && hour <= 8_759 && Number.isFinite(mean) && mean >= 0 && (peak === null || (Number.isFinite(peak) && peak >= mean));
    return valid ? [{ hour, realPower: mean, peakPower: peak }] : [];
  });
  const size = rows.length === 8_760 ? 8_760 : 24;
  if (rows.length !== size || new Set(rows.map((row) => row.hour)).size !== size || rows.some((row) => row.hour >= size)) return { status: 'invalid', detail: '' };
  return { status: 'ok', points: rows.toSorted((left, right) => left.hour - right.hour) };
}
