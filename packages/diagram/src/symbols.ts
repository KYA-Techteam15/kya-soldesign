import type { ConductorKind, PlacedSymbol, Point, SymbolKind } from './contracts.js';

/**
 * Vocabulaire graphique du schéma, d'après la CEI 60617.
 *
 * Chaque symbole est décrit dans son repère local (origine en haut à gauche),
 * expose une boîte englobante fixe et des points de raccordement nommés. Le
 * placement n'a donc jamais à connaître le dessin, et le dessin n'a jamais à
 * connaître la planche.
 */

export interface SymbolBox {
  readonly width: number;
  readonly height: number;
}

/** Points de raccordement exposés par les symboles. */
export type AnchorName =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'dc-plus'
  | 'dc-minus'
  | 'ac-out'
  | 'battery-plus'
  | 'battery-minus'
  | 'earth'
  | 'plus'
  | 'minus';

/** Palette des conducteurs. Une couleur par nature, jamais par appareil. */
export const CONDUCTOR_COLOR: Readonly<Record<ConductorKind, string>> = {
  dc: '#b3261e',
  'dc-positive': '#c8322a',
  'dc-negative': '#1f4ba3',
  ac: '#16181c',
  earth: '#3f8f2e',
  signal: '#c98a12',
};

export const CONDUCTOR_WIDTH: Readonly<Record<ConductorKind, number>> = {
  dc: 2.2,
  'dc-positive': 2,
  'dc-negative': 2,
  ac: 2.2,
  earth: 1.8,
  signal: 1.6,
};

const INK = '#16181c';
const MUTED = '#79839180';

/** Encombrement de chaque symbole, en unités de planche. */
export const SYMBOL_SIZE: Readonly<Record<SymbolKind, SymbolBox>> = {
  'pv-module': { width: 46, height: 56 },
  'series-break': { width: 46, height: 34 },
  'parallel-break': { width: 40, height: 56 },
  'dc-fuse': { width: 36, height: 46 },
  'fuse-switch': { width: 36, height: 60 },
  combiner: { width: 130, height: 30 },
  'dc-spd': { width: 34, height: 38 },
  'dc-switch': { width: 36, height: 56 },
  inverter: { width: 108, height: 64 },
  battery: { width: 56, height: 38 },
  'dc-breaker': { width: 36, height: 56 },
  'ac-breaker': { width: 36, height: 56 },
  'ac-spd': { width: 34, height: 38 },
  rcd: { width: 60, height: 62 },
  busbar: { width: 200, height: 8 },
  load: { width: 104, height: 88 },
  'charge-controller': { width: 88, height: 58 },
  meter: { width: 58, height: 44 },
  'transfer-switch': { width: 54, height: 62 },
  generator: { width: 60, height: 60 },
  grid: { width: 64, height: 64 },
  pump: { width: 60, height: 60 },
  'street-light': { width: 72, height: 88 },
  'earth-bar': { width: 14, height: 120 },
  'earth-link': { width: 42, height: 46 },
  'earth-electrode': { width: 56, height: 42 },
};

/** Renvoie un point de raccordement en coordonnées planche. */
export function anchorOf(symbol: PlacedSymbol, name: AnchorName): Point {
  const { x, y, width, height } = symbol;
  const midX = x + width / 2;
  const midY = y + height / 2;

  switch (name) {
    case 'top':
      return { x: midX, y };
    case 'bottom':
      return { x: midX, y: y + height };
    case 'left':
      return { x, y: midY };
    case 'right':
      return { x: x + width, y: midY };
    case 'dc-plus':
      return symbol.kind === 'inverter' ? { x: x + 26, y } : { x: midX, y };
    case 'dc-minus':
      return symbol.kind === 'inverter' ? { x: x + width - 26, y } : { x: midX, y };
    case 'ac-out':
      return { x: midX, y: y + height };
    case 'battery-plus':
      return { x, y: y + height * 0.34 };
    case 'battery-minus':
      return { x, y: y + height * 0.68 };
    case 'earth':
      return { x: x + width, y: y + height * 0.72 };
    case 'plus':
      return { x, y: midY };
    case 'minus':
      return { x: x + width, y: midY };
  }
}

const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const text = (
  x: number,
  y: number,
  value: string,
  size = 9,
  weight: 400 | 600 | 700 = 600,
  anchor: 'start' | 'middle' | 'end' = 'middle',
  fill: string = INK,
): string =>
  // Le liseré blanc reproduit l'interruption du trait sous une cote : c'est ce
  // qui garde une annotation lisible là où un conducteur la traverse.
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${esc(value)}</text>`;

/* -------------------------------------------------------------------------- */
/* Dessinateurs, un par symbole, en coordonnées locales                        */
/* -------------------------------------------------------------------------- */

function pvModule(symbol: PlacedSymbol): string {
  const { width: w } = symbol;
  const bodyH = 44;
  const label = String(symbol.data['label'] ?? '');
  return `
    <rect x="0" y="0" width="${w}" height="${bodyH}" fill="#ffffff" stroke="${INK}" stroke-width="1.6"/>
    <line x1="0" y1="${bodyH / 2}" x2="${w}" y2="${bodyH / 2}" stroke="${MUTED}" stroke-width="0.7"/>
    <line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${bodyH}" stroke="${MUTED}" stroke-width="0.7"/>
    <line x1="0" y1="${bodyH}" x2="${w}" y2="0" stroke="#8a95a3" stroke-width="0.9"/>
    <path d="M 4 ${bodyH} L ${w - 4} ${bodyH} L ${w / 2} ${symbol.height} Z" fill="#ffffff" stroke="${INK}" stroke-width="1.1"/>
    ${label ? text(w / 2, bodyH / 2 + 4, label, 11, 700) : ''}`;
}

function seriesBreak(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const hidden = symbol.data['hidden'];
  return `
    <line x1="${w / 2}" y1="2" x2="${w / 2}" y2="${h - 2}" stroke="#5f6b7a" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 7"/>
    ${hidden ? text(w / 2 + 17, h / 2 + 3, `×${String(hidden)}`, 9, 700, 'start', '#5f6b7a') : ''}`;
}

function parallelBreak(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const hidden = symbol.data['hidden'];
  return `
    <line x1="2" y1="${h / 2}" x2="${w - 2}" y2="${h / 2}" stroke="#5f6b7a" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 7"/>
    ${hidden ? text(w / 2, h / 2 - 8, `×${String(hidden)}`, 9, 700, 'middle', '#5f6b7a') : ''}`;
}

/** Fusible CEI : rectangle traversé par le conducteur. */
function fuse(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  return `
    <line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <rect x="${w / 2 - 8}" y="${h / 2 - 13}" width="16" height="26" fill="#ffffff" stroke="${INK}" stroke-width="1.6"/>
    <line x1="${w / 2 - 8}" y1="${h / 2}" x2="${w / 2 + 8}" y2="${h / 2}" stroke="${INK}" stroke-width="1.6"/>`;
}

/**
 * Appareil de coupure CEI : conducteur interrompu, pivot, contact mobile
 * ouvert. La croix distingue le pouvoir de coupure du simple sectionnement.
 */
function breaker(symbol: PlacedSymbol, withCross: boolean): string {
  const { width: w, height: h } = symbol;
  const cx = w / 2;
  const pivotY = h / 2 - 9;
  return `
    <line x1="${cx}" y1="0" x2="${cx}" y2="${pivotY}" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${cx}" y1="${h / 2 + 11}" x2="${cx}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${pivotY}" r="2.4" fill="${INK}"/>
    <line x1="${cx}" y1="${pivotY}" x2="${cx + 13}" y2="${pivotY + 17}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    ${withCross ? `<path d="M ${cx - 5} ${h / 2 + 6} l 10 10 M ${cx + 5} ${h / 2 + 6} l -10 10" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` : ''}`;
}

/**
 * Interrupteur-sectionneur CEI : contact ouvert et barre de sectionnement au contact fixe, sans
 * croix (la croix est réservée au disjoncteur, qui coupe un court-circuit).
 */
function switchDisconnector(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const cx = w / 2;
  const pivotY = h / 2 - 9;
  const contactY = h / 2 + 11;
  return `n    <line x1="${cx}" y1="0" x2="${cx}" y2="${pivotY}" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${cx}" y1="${contactY}" x2="${cx}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${pivotY}" r="2.4" fill="${INK}"/>
    <line x1="${cx}" y1="${pivotY}" x2="${cx + 13}" y2="${pivotY + 17}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="${cx - 6}" y1="${contactY}" x2="${cx + 6}" y2="${contactY}" stroke="${INK}" stroke-width="1.8"/>`;
}

/**
 * Sectionneur-fusible CEI : le fusible est porté par le contact mobile ; la barre de sectionnement
 * rappelle la coupure visible.
 */
function fuseSwitch(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const cx = w / 2;
  const pivotY = h * 0.26;
  const contactY = h * 0.74;
  const angle = -28;
  return `n    <line x1="${cx}" y1="0" x2="${cx}" y2="${pivotY}" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${cx}" y1="${contactY}" x2="${cx}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${pivotY}" r="2.4" fill="${INK}"/>
    <g transform="translate(${cx} ${pivotY}) rotate(${angle})">
      <line x1="0" y1="0" x2="0" y2="${contactY - pivotY + 2}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="-5" y="${(contactY - pivotY) * 0.28}" width="10" height="${(contactY - pivotY) * 0.46}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"/>
    </g>
    <line x1="${cx - 6}" y1="${contactY}" x2="${cx + 6}" y2="${contactY}" stroke="${INK}" stroke-width="1.8"/>`;
}

/** Parafoudre CEI : boîtier traversé, avec la flèche d'écoulement. */
function spd(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const cx = w / 2;
  return `
    <line x1="${cx}" y1="0" x2="${cx}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <rect x="${cx - 11}" y="6" width="22" height="${h - 12}" fill="#ffffff" stroke="${INK}" stroke-width="1.6"/>
    <path d="M ${cx - 5} ${h / 2 - 7} L ${cx + 5} ${h / 2 - 7} L ${cx - 3} ${h / 2 + 1} L ${cx + 6} ${h / 2 + 1} L ${cx - 5} ${h / 2 + 9} L ${cx} ${h / 2 + 1} L ${cx - 7} ${h / 2 + 1} Z" fill="${INK}"/>`;
}

/** Boîte de jonction : coffret en trait fin, ouvert sur ses deux faces. */
function combiner(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  return `
    <rect x="0" y="0" width="${w}" height="${h}" rx="2" fill="#ffffff" stroke="${INK}" stroke-width="1.4"/>
    ${text(w / 2, h / 2 + 3.5, String(symbol.data['label'] ?? 'Boîte de jonction'), 9, 600)}`;
}

/** Onduleur CEI : carré divisé par sa diagonale, continu à gauche, alternatif à droite. */
function inverter(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  return `
    <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <line x1="0" y1="${h}" x2="${w}" y2="0" stroke="${INK}" stroke-width="1.6"/>
    <line x1="14" y1="${h * 0.33}" x2="34" y2="${h * 0.33}" stroke="${INK}" stroke-width="1.6"/>
    <line x1="19" y1="${h * 0.45}" x2="29" y2="${h * 0.45}" stroke="${INK}" stroke-width="1.6"/>
    <path d="M ${w - 40} ${h * 0.7} q 6 -8 12 0 q 6 8 12 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
}

/** Accumulateur CEI : alternance de traits longs (+) et courts (−). */
function battery(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const midY = h / 2;
  const cells = [0, 1];
  const pitch = 13;
  const startX = w / 2 - pitch / 2 - ((cells.length - 1) * pitch) / 2;
  const bars = cells
    .map((index) => {
      const x = startX + index * pitch * 2;
      return `
        <line x1="${x}" y1="${midY - 11}" x2="${x}" y2="${midY + 11}" stroke="${INK}" stroke-width="1.6"/>
        <line x1="${x + pitch}" y1="${midY - 6}" x2="${x + pitch}" y2="${midY + 6}" stroke="${INK}" stroke-width="3.4"/>`;
    })
    .join('');
  const label = String(symbol.data['label'] ?? '');
  return `
    <line x1="0" y1="${midY}" x2="${startX}" y2="${midY}" stroke="${INK}" stroke-width="1.6"/>
    <line x1="${startX + pitch * 3}" y1="${midY}" x2="${w}" y2="${midY}" stroke="${INK}" stroke-width="1.6"/>
    ${bars}
    ${symbol.data['bare'] ? '' : text(4, midY - 14, '+', 10, 700, 'start', CONDUCTOR_COLOR['dc-positive'])}
    ${symbol.data['bare'] ? '' : text(w - 4, midY - 14, '−', 10, 700, 'end', CONDUCTOR_COLOR['dc-negative'])}
    ${label ? text(w / 2, h + 9, label, 7.5, 600, 'middle', '#5f6b7a') : ''}`;
}

/** Différentiel : appareil de coupure doublé du tore de détection. */
function rcd(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const cx = w / 2 + 6;
  const pivotY = h / 2 - 12;
  return `
    <line x1="${cx}" y1="0" x2="${cx}" y2="${pivotY}" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${cx}" y1="${h / 2 + 8}" x2="${cx}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${cx}" cy="${pivotY}" r="2.4" fill="${INK}"/>
    <line x1="${cx}" y1="${pivotY}" x2="${cx + 13}" y2="${pivotY + 16}" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M ${cx - 5} ${h / 2 - 4} l 10 10 M ${cx + 5} ${h / 2 - 4} l -10 10" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="${cx - 1}" cy="${h / 2 + 16}" rx="17" ry="7" fill="none" stroke="${INK}" stroke-width="1.6"/>
    <path d="M ${cx - 24} ${pivotY - 4} L ${cx - 12} ${pivotY - 4} M ${cx - 24} ${pivotY - 4} L ${cx - 24} ${h / 2 + 16} L ${cx - 18} ${h / 2 + 16}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-dasharray="4 3"/>`;
}

function busbar(symbol: PlacedSymbol): string {
  return `<rect x="0" y="${symbol.height / 2 - 2}" width="${symbol.width}" height="4" fill="${INK}"/>`;
}

/** Charges : silhouette de bâtiment, lisible sans légende. */
function load(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const roof = h * 0.42;
  return `
    <path d="M 6 ${roof} L ${w / 2} 6 L ${w - 6} ${roof} L ${w - 16} ${roof} L ${w - 16} ${h - 6} L 16 ${h - 6} L 16 ${roof} Z" fill="#ffffff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="${w / 2 - 11}" y="${h - 30}" width="22" height="24" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
}

/** Bornier principal de terre : barrette percée de ses points de raccordement. */
function earthBar(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  // Une borne par raccordement réel quand le placement le précise, sinon selon la longueur.
  const taps = Number(symbol.data['taps'] ?? 0);
  const holes = taps > 0 ? Math.max(2, taps) : Math.max(2, Math.round((h - 16) / 22));
  const dots = Array.from(
    { length: holes },
    (_, index) => `<circle cx="${w / 2}" cy="${12 + index * ((h - 24) / Math.max(1, holes - 1))}" r="2.2" fill="#ffffff" stroke="${INK}" stroke-width="1"/>`,
  ).join('');
  return `
    <rect x="0" y="0" width="${w}" height="${h}" rx="2" fill="#eef3ea" stroke="${INK}" stroke-width="1.4"/>
    ${dots}`;
}

/** Prise de terre CEI : trois traits horizontaux décroissants. */
function earthElectrode(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const cx = w / 2;
  const top = h * 0.28;
  return `
    <line x1="${cx}" y1="0" x2="${cx}" y2="${top}" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${cx - 20}" y1="${top}" x2="${cx + 20}" y2="${top}" stroke="${INK}" stroke-width="2.6"/>
    <line x1="${cx - 13}" y1="${top + 8}" x2="${cx + 13}" y2="${top + 8}" stroke="${INK}" stroke-width="2.2"/>
    <line x1="${cx - 6}" y1="${top + 16}" x2="${cx + 6}" y2="${top + 16}" stroke="${INK}" stroke-width="1.8"/>`;
}

/** Régulateur de charge : convertisseur continu-continu. */
function chargeController(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  return `
    <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <line x1="0" y1="${h}" x2="${w}" y2="0" stroke="${INK}" stroke-width="1.6"/>
    <line x1="12" y1="${h * 0.3}" x2="30" y2="${h * 0.3}" stroke="${INK}" stroke-width="1.6"/>
    <line x1="16" y1="${h * 0.42}" x2="26" y2="${h * 0.42}" stroke="${INK}" stroke-width="1.6"/>
    <line x1="${w - 30}" y1="${h * 0.66}" x2="${w - 12}" y2="${h * 0.66}" stroke="${INK}" stroke-width="1.6"/>
    <line x1="${w - 26}" y1="${h * 0.78}" x2="${w - 16}" y2="${h * 0.78}" stroke="${INK}" stroke-width="1.6"/>`;
}

/** Compteur d'énergie : boîtier à afficheur, symbole de comptage CEI. */
function meter(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  return `
    <line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <rect x="4" y="6" width="${w - 8}" height="${h - 12}" rx="2" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/>
    <rect x="11" y="${h / 2 - 8}" width="${w - 22}" height="11" fill="#ffffff" stroke="${INK}" stroke-width="1.1"/>
    ${text(w / 2, h / 2 + 1, '0 0 0 0', 6.5, 600)}
    ${text(w / 2, h / 2 + 13, 'kWh', 7, 700)}`;
}

/** Inverseur de source : un contact mobile, deux positions. */
function transferSwitch(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const pivotY = h - 12;
  return `
    <line x1="${w * 0.26}" y1="0" x2="${w * 0.26}" y2="14" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${w * 0.74}" y1="0" x2="${w * 0.74}" y2="14" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${w * 0.26}" cy="15" r="2.2" fill="${INK}"/>
    <circle cx="${w * 0.74}" cy="15" r="2.2" fill="${INK}"/>
    <line x1="${w / 2}" y1="${pivotY}" x2="${w * 0.28}" y2="17" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="${w / 2}" cy="${pivotY}" r="2.4" fill="${INK}"/>
    <line x1="${w / 2}" y1="${pivotY}" x2="${w / 2}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>`;
}

/** Machine tournante CEI : cercle portant sa lettre de fonction. */
function machine(letter: string) {
  return (symbol: PlacedSymbol): string => {
    const { width: w, height: h } = symbol;
    const r = Math.min(w, h) / 2 - 2;
    return `
      <line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h / 2 - r}" stroke="${INK}" stroke-width="1.8"/>
      <circle cx="${w / 2}" cy="${h / 2}" r="${r}" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
      ${text(w / 2, h / 2 + 6, letter, 17, 700)}`;
  };
}

/** Réseau de distribution : source alternative. */
function grid(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const r = Math.min(w, h) / 2 - 2;
  const cy = h / 2;
  return `
    <line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${cy - r}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${w / 2}" cy="${cy}" r="${r}" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <path d="M ${w / 2 - 15} ${cy} q 5 -9 10 0 q 5 9 10 0" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    ${text(w / 2, cy + 19, '~', 13, 700)}`;
}

/** Pompe CEI : cercle et triangle de refoulement. */
function pump(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const r = Math.min(w, h) / 2 - 2;
  const cy = h / 2;
  return `
    <line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${cy - r}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${w / 2}" cy="${cy}" r="${r}" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <path d="M ${w / 2 - 8} ${cy - 9} L ${w / 2 + 11} ${cy} L ${w / 2 - 8} ${cy + 9} Z" fill="${INK}"/>`;
}

/** Luminaire sur mât. */
function streetLight(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const poleX = w / 2;
  return `
    <line x1="${poleX}" y1="18" x2="${poleX}" y2="${h}" stroke="${INK}" stroke-width="2.4"/>
    <path d="M ${poleX} 18 q 0 -12 16 -12" fill="none" stroke="${INK}" stroke-width="2.4"/>
    <path d="M ${poleX + 6} 6 L ${poleX + 26} 6 L ${poleX + 22} 15 L ${poleX + 10} 15 Z" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${poleX + 10}" y1="20" x2="${poleX + 8}" y2="26" stroke="${INK}" stroke-width="1.2"/>
    <line x1="${poleX + 16}" y1="20" x2="${poleX + 16}" y2="27" stroke="${INK}" stroke-width="1.2"/>
    <line x1="${poleX + 22}" y1="20" x2="${poleX + 24}" y2="26" stroke="${INK}" stroke-width="1.2"/>`;
}

/**
 * Barrette de coupure : liaison démontable entre le collecteur et la prise de
 * terre. Sans elle, la résistance de terre n'est pas mesurable.
 */
function earthLink(symbol: PlacedSymbol): string {
  const { width: w, height: h } = symbol;
  const cx = w / 2;
  return `
    <line x1="${cx}" y1="0" x2="${cx}" y2="10" stroke="${INK}" stroke-width="1.8"/>
    <line x1="${cx}" y1="${h - 10}" x2="${cx}" y2="${h}" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="${cx}" cy="12" r="3" fill="#ffffff" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="${cx}" cy="${h - 12}" r="3" fill="#ffffff" stroke="${INK}" stroke-width="1.6"/>
    <line x1="${cx + 9}" y1="13" x2="${cx + 9}" y2="${h - 13}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <line x1="${cx}" y1="12" x2="${cx + 9}" y2="13" stroke="${INK}" stroke-width="1.4"/>
    <line x1="${cx}" y1="${h - 12}" x2="${cx + 9}" y2="${h - 13}" stroke="${INK}" stroke-width="1.4"/>`;
}

const DRAWERS: Readonly<Record<SymbolKind, (symbol: PlacedSymbol) => string>> = {
  'pv-module': pvModule,
  'series-break': seriesBreak,
  'parallel-break': parallelBreak,
  'dc-fuse': fuse,
  combiner,
  'dc-spd': spd,
  'dc-switch': switchDisconnector,
  'fuse-switch': fuseSwitch,
  inverter,
  battery,
  'dc-breaker': (symbol) => breaker(symbol, true),
  'ac-breaker': (symbol) => breaker(symbol, true),
  'ac-spd': spd,
  rcd,
  busbar,
  load,
  'charge-controller': chargeController,
  meter,
  'transfer-switch': transferSwitch,
  generator: machine('G'),
  grid,
  pump,
  'street-light': streetLight,
  'earth-bar': earthBar,
  'earth-link': earthLink,
  'earth-electrode': earthElectrode,
};

/** Dessine un symbole placé, repère et annotation compris. */
export function drawSymbol(symbol: PlacedSymbol): string {
  if (symbol.rotation === -90) {
    // Dessiné dans son repère vertical (largeur et hauteur locales échangées), puis tourné : le
    // haut du symbole devient sa gauche, le courant y circule de gauche à droite.
    const local: PlacedSymbol = { ...symbol, width: symbol.height, height: symbol.width };
    const body = DRAWERS[symbol.kind](local);
    return `<g transform="translate(${round(symbol.x)} ${round(symbol.y + symbol.height)}) rotate(-90)" data-symbol="${symbol.kind}" data-id="${esc(symbol.id)}">${body}</g>`;
  }
  const body = DRAWERS[symbol.kind](symbol);
  const labelled = symbol.showLabels !== false;
  // Le repère se pose à gauche du symbole : un conducteur descend toujours par
  // son axe, un libellé centré au-dessus serait donc systématiquement barré.
  const reference = labelled && symbol.reference
    ? text(-6, 11, symbol.reference, 9, 700, 'end', '#5f6b7a')
    : '';
  const caption = labelled && symbol.caption
    ? text(symbol.width + 8, symbol.height / 2 + 3, symbol.caption, 8.5, 600, 'start', '#3d4753')
    : '';
  return `<g transform="translate(${round(symbol.x)} ${round(symbol.y)})" data-symbol="${symbol.kind}" data-id="${esc(symbol.id)}">${reference}${body}${caption}</g>`;
}

/** Arrondi stable : évite les flottants longs dans le SVG et fige les golden. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export { esc as escapeXml, text as svgText, INK as INK_COLOR };
