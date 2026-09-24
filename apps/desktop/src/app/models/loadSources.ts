import { hourlyPeakPowerWithStartupsW, normalizeEquipmentRows } from '@ksd/engine';
import type { ApplianceView, DirectLoadProfileView, ProjectViewModel } from './projectView.js';

/** Les cinq sources de consommation proposées à l'utilisateur (spec 011, D1). */
export type LoadSourceKey = 'equipments' | 'hourly' | 'composed' | 'annual' | 'meter';
export const LOAD_SOURCE_KEYS: readonly LoadSourceKey[] = ['equipments', 'hourly', 'composed', 'annual', 'meter'];

export function activeLoadSource(project: ProjectViewModel): LoadSourceKey {
  if (project.load.activeMode === 'composed' && project.load.composition !== null) return 'composed';
  return project.load.profiles.find((profile) => profile.id === project.load.activeProfileId)?.source ?? 'equipments';
}

/**
 * Rien n'est encore saisi, dans aucune source : l'étape pose alors sa question
 * « De quoi disposez-vous ? » au lieu d'ouvrir un tableau vide.
 */
export function isLoadEmpty(project: ProjectViewModel): boolean {
  if (project.load.composition !== null) return false;
  return project.load.profiles.every((profile) => profile.appliances.length === 0
    && profile.hourly.every((point) => point.realPower === 0)
    && profile.annual === null
    && (profile.meter === null || profile.meter.observedEnergy === 0));
}

/**
 * Profil horaire direct (kW) tiré d'un inventaire d'appareils : puissance moyenne heure par heure
 * et pointe au démarrage, par les règles du moteur. Point de départ de l'année composée.
 */
export function inventoryDirectProfile(appliances: readonly ApplianceView[], profile: { readonly id: string; readonly name: string; readonly color: string }): DirectLoadProfileView {
  const normalized = normalizeEquipmentRows({
    timezoneIana: 'Etc/UTC',
    rows: appliances.map((row) => ({
      id: row.id, label: row.name || row.id, quantity: row.qty, usefulPowerW: row.unitPower, efficiencyRatio: row.yield,
      hourlyOperatingFractions: row.operatingFractions, startupPowerMultiplier: row.startupCoef > 1 ? row.startupCoef : null,
    })),
  });
  const meanW = normalized.status === 'ready' ? normalized.load.hourlyEnergyWh : Array.from({ length: 24 }, () => 0);
  const peakW = normalized.status === 'ready' ? hourlyPeakPowerWithStartupsW(meanW, normalized.load.startupEvents) : meanW;
  return {
    id: profile.id,
    name: profile.name,
    color: profile.color,
    hourly: meanW.map((value, hour) => ({ hour, realPower: value / 1000, peakPower: Math.max(value, peakW[hour] ?? value) / 1000 })),
  };
}
