/**
 * Graphes des documents.
 *
 * Le rapport annonçait une puissance crête sans montrer ni le gisement qui la
 * justifie, ni la consommation qu'elle couvre. Deux courbes suffisent à rendre
 * la démonstration lisible ; elles sont produites en SVG déterministe, ce qui
 * leur permet de sortir nettes à l'impression et de traverser Word par la même
 * rastérisation que la planche unifilaire.
 *
 * Aucune bibliothèque : ces tracés sont assez simples pour être écrits, et
 * assez stables pour être comparés d'une version à l'autre.
 */

export interface ReportChart {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
}

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 24, right: 20, bottom: 40, left: 58 } as const;
const PLOT = {
  width: WIDTH - PAD.left - PAD.right,
  height: HEIGHT - PAD.top - PAD.bottom,
} as const;

const INK = '#1a1a1a';
const MUTED = '#7a7a7a';
const RULE = '#e2e6ea';
const ORANGE = '#f99d32';
const TEAL = '#1ca18c';

/** Échappe le texte inséré dans le SVG : un nom de mois reste du texte. */
const escape = (value: string): string =>
  value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

const round = (value: number): string => (Math.round(value * 100) / 100).toString();

/** Graduation lisible : 4 paliers sur une valeur ronde au-dessus du maximum. */
function scale(maximum: number): { top: number; ticks: number[] } {
  if (!(maximum > 0)) return { top: 1, ticks: [0, 0.5, 1] };
  const rough = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(maximum / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(value);
  return { top, ticks };
}

function frame(ticks: number[], top: number, unit: string, decimals: number): string {
  const lines = ticks.map((value) => {
    const y = PAD.top + PLOT.height - (value / top) * PLOT.height;
    return `<line x1="${PAD.left}" y1="${round(y)}" x2="${PAD.left + PLOT.width}" y2="${round(y)}" stroke="${RULE}" stroke-width="1"/>`
      + `<text x="${PAD.left - 8}" y="${round(y + 3.5)}" text-anchor="end" font-size="10" fill="${MUTED}">${value.toFixed(decimals)}</text>`;
  }).join('');
  return `${lines}<text x="${PAD.left - 8}" y="${PAD.top - 10}" text-anchor="end" font-size="9.5" fill="${MUTED}">${escape(unit)}</text>`;
}

const open = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" font-family="Inter, Segoe UI, system-ui, sans-serif">`
  + `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>`;

/**
 * Irradiation mensuelle en plan des modules.
 *
 * Douze barres : c'est ce qui rend visible la saison qui dimensionne, et le
 * creux que le stockage doit absorber.
 */
export function monthlyIrradiationChart(monthly: readonly (number | null)[], labels: readonly string[]): ReportChart | null {
  const values = monthly.map((value) => (value === null || !Number.isFinite(value) ? 0 : value));
  if (values.length !== 12 || values.every((value) => value <= 0)) return null;
  const { top, ticks } = scale(Math.max(...values));
  const slot = PLOT.width / 12;
  const barWidth = slot * 0.62;

  const bars = values.map((value, month) => {
    const height = (value / top) * PLOT.height;
    const x = PAD.left + slot * month + (slot - barWidth) / 2;
    const y = PAD.top + PLOT.height - height;
    return `<rect x="${round(x)}" y="${round(y)}" width="${round(barWidth)}" height="${round(Math.max(1, height))}" fill="${ORANGE}" rx="2"/>`
      + `<text x="${round(x + barWidth / 2)}" y="${round(y - 5)}" text-anchor="middle" font-size="9" fill="${INK}">${value.toFixed(1)}</text>`
      + `<text x="${round(x + barWidth / 2)}" y="${PAD.top + PLOT.height + 16}" text-anchor="middle" font-size="10" fill="${MUTED}">${escape(labels[month] ?? '')}</text>`;
  }).join('');

  return {
    svg: `${open()}${frame(ticks, top, 'kWh/m²/j', 1)}${bars}`
      + `<line x1="${PAD.left}" y1="${PAD.top + PLOT.height}" x2="${PAD.left + PLOT.width}" y2="${PAD.top + PLOT.height}" stroke="${INK}" stroke-width="1.2"/></svg>`,
    width: WIDTH,
    height: HEIGHT,
  };
}

/**
 * Journée de consommation, heure par heure.
 *
 * C'est la forme que le dimensionnement doit couvrir : là où elle déborde du
 * gisement, il faut du stockage. Superposer l'irradiance moyenne rend ce
 * décalage — le fondement du y_En — visible sans une ligne d'explication.
 */
export function dailyLoadChart(hourlyEnergyWh: readonly number[], meanHourlyPoaWm2: readonly number[] | null, labels: { load: string; sun: string }): ReportChart | null {
  if (hourlyEnergyWh.length !== 24 || hourlyEnergyWh.every((value) => value <= 0)) return null;
  const kw = hourlyEnergyWh.map((value) => value / 1000);
  const { top, ticks } = scale(Math.max(...kw));
  const slot = PLOT.width / 24;
  const barWidth = slot * 0.66;

  const bars = kw.map((value, hour) => {
    const height = (value / top) * PLOT.height;
    const x = PAD.left + slot * hour + (slot - barWidth) / 2;
    const y = PAD.top + PLOT.height - height;
    const label = hour % 3 === 0
      ? `<text x="${round(x + barWidth / 2)}" y="${PAD.top + PLOT.height + 16}" text-anchor="middle" font-size="9.5" fill="${MUTED}">${String(hour).padStart(2, '0')}</text>`
      : '';
    return `<rect x="${round(x)}" y="${round(y)}" width="${round(barWidth)}" height="${round(Math.max(1, height))}" fill="${TEAL}" rx="1.5"/>${label}`;
  }).join('');

  // L'irradiance est tracée sur sa propre échelle : on compare des formes, pas
  // des grandeurs, et l'axe de gauche resterait faux pour deux unités.
  let sun = '';
  if (meanHourlyPoaWm2 !== null && meanHourlyPoaWm2.length === 24) {
    const sunTop = Math.max(...meanHourlyPoaWm2, 1);
    const points = meanHourlyPoaWm2.map((value, hour) => {
      const x = PAD.left + slot * hour + slot / 2;
      const y = PAD.top + PLOT.height - (value / sunTop) * PLOT.height;
      return `${round(x)},${round(y)}`;
    }).join(' ');
    sun = `<polyline points="${points}" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-linejoin="round"/>`;
  }

  const legend = `<g font-size="10" fill="${INK}">`
    + `<rect x="${PAD.left}" y="6" width="10" height="10" fill="${TEAL}" rx="2"/>`
    + `<text x="${PAD.left + 16}" y="15">${escape(labels.load)}</text>`
    + (sun === '' ? '' : `<line x1="${PAD.left + 130}" y1="11" x2="${PAD.left + 148}" y2="11" stroke="${ORANGE}" stroke-width="2"/>`
      + `<text x="${PAD.left + 154}" y="15">${escape(labels.sun)}</text>`)
    + '</g>';

  return {
    svg: `${open()}${frame(ticks, top, 'kW', 1)}${bars}${sun}${legend}`
      + `<line x1="${PAD.left}" y1="${PAD.top + PLOT.height}" x2="${PAD.left + PLOT.width}" y2="${PAD.top + PLOT.height}" stroke="${INK}" stroke-width="1.2"/></svg>`,
    width: WIDTH,
    height: HEIGHT,
  };
}
