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

/** Largeur utile d'une page, marges d'impression déduites, en millimètres. */
export const USABLE_MM: Readonly<Record<'a4-landscape' | 'a4-portrait', number>> = {
  'a4-landscape': 267,
  'a4-portrait': 178,
};

/** Hauteur utile d'une page, en millimètres. */
export const USABLE_HEIGHT_MM: Readonly<Record<'a4-landscape' | 'a4-portrait', number>> = {
  'a4-landscape': 182,
  'a4-portrait': 267,
};
