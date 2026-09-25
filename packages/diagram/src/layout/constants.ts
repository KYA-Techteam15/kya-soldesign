import type { SheetFormat } from '../contracts.js';

/** Constantes de planche. Une seule source pour le placement et le rendu. */

/** Marge intérieure entre le cadre de repérage et le dessin. */
export const MARGIN = 34;
export const LEGEND_ROW = 17;
export const LEGEND_ROWS_PER_COLUMN = 4;
export const LEGEND_COLUMN_WIDTH = 176;
export const TITLE_WIDTH = 440;
export const TITLE_HEIGHT = 92;
/** Cadre de repérage : colonnes en lettres, rangées en chiffres, comme une planche d'exécution. */
export const GRID_COLUMNS = 12;
export const GRID_ROWS = 8;
export const GRID_MARGIN = 18;

/** Plus petit corps de texte réellement porteur d'information, en pixels planche. */
export const SMALLEST_TEXT_PX = 8;

/**
 * Surface utile des planches paysage normalisées, marges d'impression déduites, en millimètres.
 * Classées par surface croissante : la sélection automatique retient la première planche lisible.
 */
export const SHEETS: readonly {
  readonly format: SheetFormat;
  readonly usableWidthMm: number;
  readonly usableHeightMm: number;
}[] = [
  { format: 'a4-landscape', usableWidthMm: 267, usableHeightMm: 182 },
  { format: 'a3-landscape', usableWidthMm: 390, usableHeightMm: 267 },
  { format: 'a2-landscape', usableWidthMm: 564, usableHeightMm: 390 },
];

const BY_FORMAT = new Map<SheetFormat, { usableWidthMm: number; usableHeightMm: number }>([
  ...SHEETS.map((sheet) => [sheet.format, sheet] as const),
  ['a4-portrait', { usableWidthMm: 178, usableHeightMm: 267 }],
  ['a3-portrait', { usableWidthMm: 267, usableHeightMm: 390 }],
  ['a2-portrait', { usableWidthMm: 390, usableHeightMm: 564 }],
]);

/** Largeur utile d'une page, marges d'impression déduites, en millimètres. */
export const USABLE_MM = (format: SheetFormat): number => BY_FORMAT.get(format)!.usableWidthMm;

/** Hauteur utile d'une page, en millimètres. */
export const USABLE_HEIGHT_MM = (format: SheetFormat): number => BY_FORMAT.get(format)!.usableHeightMm;
