import type { SheetFormat } from '../contracts.js';

/** Constantes de planche. Une seule source pour toutes les bandes. */

export const MARGIN = 46;
/** Hauteur réservée au-dessus du champ pour les repères de chaîne et le cadre. */
export const LABEL_HEADROOM = 44;
export const STRING_GAP = 30;
export const GROUP_GAP = 74;
/** Demi-écartement entre le conducteur + et le conducteur − d'une paire. */
export const PAIR_HALF = 13;
export const BAND_GAP = 44;
export const BATTERY_GAP_X = 26;
export const BATTERY_GAP_Y = 22;
export const BATTERY_LANE = 128;
export const EARTH_LANE = 96;
export const SOURCE_LANE = 150;
export const LEGEND_WIDTH = 216;
export const LEGEND_ROW = 19;
export const TITLE_HEIGHT = 78;
/** Pas du cadre de repérage alphanumérique. */
export const GRID_CELL = 64;
export const GRID_MARGIN = 18;

/** Plus petit corps de texte réellement porteur d'information, en pixels planche. */
export const SMALLEST_TEXT_PX = 8;

/**
 * Surface utile des planches normalisées, marges d'impression déduites, en
 * millimètres.
 *
 * Un unifilaire complet est un dessin haut : ses bandes s'empilent du champ
 * continu à la prise de terre. Le format A4 ne le reçoit qu'une fois condensé ;
 * au-delà, la planche d'exécution est en A3 ou en A2, comme sur un chantier.
 * Les formats sont classés par surface croissante : la sélection automatique
 * parcourt ce tableau dans l'ordre et retient la première planche lisible.
 */
export const SHEETS: readonly {
  readonly format: SheetFormat;
  readonly usableWidthMm: number;
  readonly usableHeightMm: number;
}[] = [
  { format: 'a4-portrait', usableWidthMm: 178, usableHeightMm: 267 },
  { format: 'a4-landscape', usableWidthMm: 267, usableHeightMm: 182 },
  { format: 'a3-portrait', usableWidthMm: 267, usableHeightMm: 390 },
  { format: 'a3-landscape', usableWidthMm: 390, usableHeightMm: 267 },
  { format: 'a2-portrait', usableWidthMm: 390, usableHeightMm: 564 },
  { format: 'a2-landscape', usableWidthMm: 564, usableHeightMm: 390 },
];

const BY_FORMAT = new Map(SHEETS.map((sheet) => [sheet.format, sheet]));

/** Largeur utile d'une page, marges d'impression déduites, en millimètres. */
export const USABLE_MM = (format: SheetFormat): number => BY_FORMAT.get(format)!.usableWidthMm;

/** Hauteur utile d'une page, en millimètres. */
export const USABLE_HEIGHT_MM = (format: SheetFormat): number => BY_FORMAT.get(format)!.usableHeightMm;
