import { summarizeEquipmentRow, type SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../models/projectView.js';

/**
 * Synthèse des besoins pour les documents.
 *
 * Le rapport ne recalcule plus la charge : il lit la journée normalisée que le
 * moteur a réellement utilisée pour dimensionner (`solar-resource`), et ne
 * détaille les appareils que lorsqu'il y en a. Recalculer ici avait produit
 * deux chiffrages divergents du même projet — celui imprimé multipliait par le
 * rendement là où le moteur divise, et ignorait les fractions horaires.
 */

export interface ReportLoadRow {
  readonly id: string;
  readonly label: string;
  readonly quantity: number;
  readonly calledPowerW: number | null;
  readonly dailyEnergyWh: number | null;
}

export type ReportLoadOrigin = 'equipments' | 'hourly' | 'meter' | 'composed';

export interface ReportLoadSummary {
  readonly origin: ReportLoadOrigin;
  /** Clé de libellé décrivant d'où vient la consommation. */
  readonly originKey: string;
  /** Détail par appareil. Vide dès que la source n'est pas un inventaire. */
  readonly rows: readonly ReportLoadRow[];
  readonly totalQuantity: number | null;
  readonly calledPowerW: number | null;
  readonly dailyEnergyWh: number | null;
  readonly peakPowerW: number | null;
  /** Les totaux viennent de la journée normalisée du moteur. */
  readonly fromEngine: boolean;
}

const ORIGIN_KEYS: Record<ReportLoadOrigin, string> = {
  equipments: 'report.loadOrigin.equipments',
  hourly: 'report.loadOrigin.hourly',
  meter: 'report.loadOrigin.meter',
  composed: 'report.loadOrigin.composed',
};

export function buildReportLoadSummary(
  project: ProjectViewModel,
  solar: SolarResourceAnalysisOutputV1 | null,
): ReportLoadSummary {
  const composed = project.load.activeMode === 'composed' && project.load.composition !== null;
  const profile = project.load.profiles.find((candidate) => candidate.id === project.load.activeProfileId) ?? null;
  const origin: ReportLoadOrigin = composed ? 'composed' : profile?.source ?? 'equipments';

  const rows = origin === 'equipments' && profile !== null ? equipmentRows(profile) : [];

  // La journée normalisée est la seule référence commune aux quatre modes de
  // saisie : c'est elle qui a servi au dimensionnement.
  const hourlyEnergyWh = solar?.loadHourlyEnergyWh ?? null;
  const hourlyPeakPowerW = solar?.loadHourlyPeakPowerW ?? null;
  const engineDailyEnergyWh = hourlyEnergyWh === null ? null : sum(hourlyEnergyWh);
  const enginePeakPowerW = hourlyPeakPowerW === null
    ? hourlyEnergyWh === null ? null : Math.max(...hourlyEnergyWh)
    : Math.max(...hourlyPeakPowerW);

  const rowEnergyWh = rows.every((row) => row.dailyEnergyWh !== null)
    ? sum(rows.map((row) => row.dailyEnergyWh!))
    : null;
  const rowCalledPowerW = rows.length > 0 && rows.every((row) => row.calledPowerW !== null)
    ? sum(rows.map((row) => row.calledPowerW!))
    : null;

  return {
    origin,
    originKey: ORIGIN_KEYS[origin],
    rows,
    totalQuantity: rows.length > 0 ? sum(rows.map((row) => row.quantity)) : null,
    calledPowerW: rowCalledPowerW,
    dailyEnergyWh: engineDailyEnergyWh ?? (rows.length > 0 ? rowEnergyWh : null),
    peakPowerW: enginePeakPowerW,
    fromEngine: engineDailyEnergyWh !== null,
  };
}

function equipmentRows(profile: NonNullable<ProjectViewModel['load']['profiles'][number]>): readonly ReportLoadRow[] {
  const classic = profile.classic.map((row) => toReportRow(row, null));
  const inductive = profile.inductive.map((row) => toReportRow(row, row.startupCoef));
  return [...classic, ...inductive];
}

function toReportRow(
  row: {
    id: string; name: string; qty: number; unitPower: number;
    yield: number | null; simultaneity: number | null; operatingFractions: number[];
  },
  startupPowerMultiplier: number | null,
): ReportLoadRow {
  // Même fonction que celle affichée à l'étape « Besoins » : une seule règle,
  // un seul résultat, quel que soit l'écran qui la montre.
  const line = summarizeEquipmentRow({
    id: row.id,
    label: row.name,
    quantity: row.qty,
    usefulPowerW: row.unitPower,
    efficiencyRatio: row.yield,
    simultaneityRatio: row.simultaneity,
    hourlyOperatingFractions: row.operatingFractions,
    startupPowerMultiplier,
  });
  return {
    id: row.id,
    label: row.name,
    quantity: row.qty,
    calledPowerW: line === null ? null : line.calledElectricalPowerW,
    dailyEnergyWh: line === null ? null : line.dailyEnergyWh,
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
