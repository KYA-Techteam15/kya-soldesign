/**
 * Courants admissibles et facteurs de correction — IEC 60364-5-52:2009.
 *
 * Isolant PVC 70 °C, deux conducteurs chargés (monophasé ou DC).
 * - Méthode C : câble fixé sur paroi ou chemin non perforé → « non enterré ».
 * - Méthode D1 : câble dans conduit enterré → « enterré ».
 * Tableaux B.52.2 (cuivre) et B.52.3 (aluminium) ; températures B.52.14 (air,
 * référence 30 °C) et B.52.15 (sol, référence 20 °C).
 *
 * Transcription à revérifier contre l'exemplaire normatif avant publication
 * (specs/010-release-readiness/checklists/requirements.md).
 */
import type { CableMaterial } from './contracts.js';

export type InstallationMethod = 'C' | 'D1';

export const IEC_SECTIONS_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300] as const;

/** Courant admissible I_z (A) par section, dans l'ordre de `IEC_SECTIONS_MM2`. */
const AMPACITY: Record<CableMaterial, Record<InstallationMethod, readonly (number | null)[]>> = {
  copper: {
    C: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344, 392, 461, 530],
    D1: [22, 29, 37, 46, 60, 78, 99, 119, 140, 173, 204, 231, 261, 292, 336, 379],
  },
  // L'aluminium n'est pas normalisé sous 2,5 mm².
  aluminium: {
    C: [null, 21, 28, 36, 49, 66, 83, 103, 125, 160, 195, 226, 261, 298, 352, 406],
    D1: [null, 22, 29, 36, 47, 61, 77, 93, 109, 135, 159, 180, 204, 228, 262, 296],
  },
};

/** Facteur de correction de température ambiante, PVC. */
const AIR_TEMPERATURE_FACTORS: readonly (readonly [number, number])[] = [[10, 1.22], [15, 1.17], [20, 1.12], [25, 1.06], [30, 1.0], [35, 0.94], [40, 0.87], [45, 0.79], [50, 0.71], [55, 0.61], [60, 0.5]];
const GROUND_TEMPERATURE_FACTORS: readonly (readonly [number, number])[] = [[10, 1.1], [15, 1.05], [20, 1.0], [25, 0.95], [30, 0.89], [35, 0.84], [40, 0.77], [45, 0.71], [50, 0.63]];

/** Température de référence des tableaux : 30 °C dans l'air, 20 °C dans le sol. */
export const REFERENCE_TEMPERATURE_C: Record<InstallationMethod, number> = { C: 30, D1: 20 };

export function ampacityA(material: CableMaterial, method: InstallationMethod, sectionMm2: number): number | null {
  const index = IEC_SECTIONS_MM2.indexOf(sectionMm2 as (typeof IEC_SECTIONS_MM2)[number]);
  return index < 0 ? null : AMPACITY[material][method][index] ?? null;
}

/**
 * Facteur k_T : la température est arrondie au pas supérieur du tableau (côté
 * sûr). Au-delà du tableau, aucun facteur n'est inventé.
 */
export function temperatureCorrectionFactor(method: InstallationMethod, temperatureC: number): number | null {
  const table = method === 'C' ? AIR_TEMPERATURE_FACTORS : GROUND_TEMPERATURE_FACTORS;
  if (temperatureC <= table[0]![0]) return table[0]![1];
  return table.find(([limit]) => temperatureC <= limit)?.[1] ?? null;
}
