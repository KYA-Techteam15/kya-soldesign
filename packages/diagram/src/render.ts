import type { Caption, ConductorKind, DiagramPlan, LegendRow, PlacedSymbol, SymbolKind, Wire } from './contracts.js';
import type { DiagramLabels } from './labels.js';
import { FR_LABELS } from './labels.js';
import {
  CONDUCTOR_COLOR,
  CONDUCTOR_WIDTH,
  INK_COLOR,
  SYMBOL_SIZE,
  drawSymbol,
  escapeXml,
  round,
  svgText,
} from './symbols.js';
import { LEGEND_COLUMN_WIDTH, LEGEND_ROW } from './layout/constants.js';
import { textWidth } from './layout/geometry.js';

/**
 * Émission du SVG.
 *
 * Le rendu est une pure fonction de la planche : mêmes entrées, même chaîne, au caractère près.
 * C'est ce qui en fait une pièce de dossier — vectorielle à l'impression, comparable en test —
 * plutôt qu'une capture d'écran.
 */

const TONE: Record<Caption['tone'], string> = {
  ink: INK_COLOR,
  muted: '#4f5b69',
  accent: '#0b6a5f',
};

const isConductor = (kind: LegendRow['kind']): kind is ConductorKind =>
  kind === 'dc' || kind === 'dc-positive' || kind === 'dc-negative' || kind === 'ac' || kind === 'earth' || kind === 'signal';

const dashOf = (kind: ConductorKind, dashed: boolean): string =>
  kind === 'earth' ? ' stroke-dasharray="9 4"' : dashed ? ' stroke-dasharray="6 5"' : '';

/**
 * Tirets obliques au milieu du plus long tronçon : la convention unifilaire qui dit combien de
 * conducteurs porte la liaison (deux en continu, trois en alternatif monophasé avec PE).
 */
function conductorTicks(wire: Wire): string {
  const count = wire.conductors ?? 0;
  if (count < 2) return '';
  let best = { length: -1, x: 0, y: 0, vertical: false };
  for (let index = 1; index < wire.points.length; index += 1) {
    const a = wire.points[index - 1]!;
    const b = wire.points[index]!;
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (length > best.length) best = { length, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vertical: Math.abs(b.y - a.y) > Math.abs(b.x - a.x) };
  }
  if (best.length < 24) return '';
  const color = CONDUCTOR_COLOR[wire.conductor];
  const ticks: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = (index - (count - 1) / 2) * 5;
    const cx = best.vertical ? best.x : best.x + offset;
    const cy = best.vertical ? best.y + offset : best.y;
    ticks.push(best.vertical
      ? `<line x1="${round(cx - 5)}" y1="${round(cy + 3)}" x2="${round(cx + 5)}" y2="${round(cy - 3)}" stroke="${color}" stroke-width="1.4"/>`
      : `<line x1="${round(cx - 3)}" y1="${round(cy + 5)}" x2="${round(cx + 3)}" y2="${round(cy - 5)}" stroke="${color}" stroke-width="1.4"/>`);
  }
  return ticks.join('');
}

function renderWire(wire: Wire): string {
  const color = CONDUCTOR_COLOR[wire.conductor];
  const width = CONDUCTOR_WIDTH[wire.conductor];
  const points = wire.points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ');
  return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="square" stroke-linejoin="miter"${dashOf(wire.conductor, wire.dashed)}/>${conductorTicks(wire)}`;
}

/** Vignette de légende : le symbole réel, réduit, pour éviter toute divergence. */
function legendIcon(kind: SymbolKind, x: number, y: number): string {
  const size = SYMBOL_SIZE[kind];
  const scale = Math.min(20 / size.width, 20 / size.height);
  const sample: PlacedSymbol = { id: `legend-${kind}`, kind, x: 0, y: 0, width: size.width, height: size.height, reference: null, caption: null, data: { bare: true }, showLabels: false };
  const inner = drawSymbol(sample).replace(/^<g[^>]*>/, '').replace(/<\/g>$/, '');
  const dx = x + (24 - size.width * scale) / 2;
  const dy = y + (20 - size.height * scale) / 2;
  return `<g transform="translate(${round(dx)} ${round(dy)}) scale(${round(scale)})">${inner}</g>`;
}

function renderLegend(plan: DiagramPlan, labels: DiagramLabels): string {
  const box = plan.footer.legend;
  if (!box || plan.legend.length === 0) return '';
  const rows = plan.legend
    .map((row, index) => {
      const column = Math.floor(index / box.rows);
      const x = box.x + 10 + column * LEGEND_COLUMN_WIDTH;
      const rowY = box.y + 24 + (index % box.rows) * LEGEND_ROW;
      const icon = isConductor(row.kind)
        ? `<line x1="${x + 2}" y1="${rowY + 6}" x2="${x + 24}" y2="${rowY + 6}" stroke="${CONDUCTOR_COLOR[row.kind]}" stroke-width="${CONDUCTOR_WIDTH[row.kind]}"${dashOf(row.kind, false)}/>`
        : legendIcon(row.kind, x, rowY - 4);
      return `${icon}${svgText(x + 32, rowY + 9, fit(row.label, LEGEND_COLUMN_WIDTH - 40, 8), 8, 600, 'start', '#3d4753')}`;
    })
    .join('');
  return `
    <g class="legend">
      <rect x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" height="${round(box.height)}" rx="3" fill="#ffffff" stroke="#c3ccd6" stroke-width="1.2"/>
      ${svgText(box.x + 10, box.y + 15, labels.legend, 9, 700, 'start', INK_COLOR)}
      ${rows}
    </g>`;
}

/** Tronque un texte à la largeur disponible, avec une ellipse : jamais de débordement dans la case voisine. */
function fit(value: string, width: number, size: number): string {
  if (textWidth(value, size) <= width) return value;
  let kept = value;
  while (kept.length > 1 && textWidth(`${kept}…`, size) > width) kept = kept.slice(0, -1);
  return `${kept.trimEnd()}…`;
}

function renderTitleBlock(plan: DiagramPlan, labels: DiagramLabels): string {
  const box = plan.footer.title;
  if (!plan.showTitleBlock || !box) return '';
  const { title } = plan;
  const cellW = box.width / 3;
  const reference = [title.reference, title.revision].filter(Boolean).join(' · ');
  const cells: readonly (readonly [string, string])[] = [
    [labels.titleProject, title.project],
    [labels.titleClient, title.client],
    [title.revision ? `${labels.titleReference} · ${labels.titleRevision}` : labels.titleReference, reference],
    [labels.titleLocation, title.location],
    [labels.titleDate, title.date],
    [labels.titleAuthor, title.author],
  ];
  const grid = cells
    .map(([label, value], index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const cx = box.x + column * cellW;
      const cy = box.y + 26 + row * 33;
      return `
        <rect x="${round(cx)}" y="${round(cy)}" width="${round(cellW)}" height="33" fill="none" stroke="#d6dde5" stroke-width="1"/>
        ${svgText(cx + 8, cy + 12, label.toUpperCase(), 6.5, 700, 'start', '#8b95a1')}
        ${svgText(cx + 8, cy + 26, fit(value || '—', cellW - 14, 9), 9, 600, 'start', INK_COLOR)}`;
    })
    .join('');
  const heading = [title.company, labels.titleSheet].filter(Boolean).join(' — ');
  return `
    <g class="title-block">
      <rect x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" height="${round(box.height)}" fill="#ffffff" stroke="#9aa5b1" stroke-width="1.4"/>
      ${svgText(box.x + 8, box.y + 17, fit(heading, box.width - 90, 9), 9, 700, 'start', INK_COLOR)}
      ${svgText(box.x + box.width - 8, box.y + 17, `${labels.titlePlate} ${title.sheet}`, 8, 600, 'end', '#66717f')}
      ${grid}
    </g>`;
}

/** Cadre de repérage alphanumérique, en marge de planche. */
function renderGridFrame(plan: DiagramPlan): string {
  const grid = plan.grid;
  if (!grid) return '';
  const m = grid.margin;
  const inner = `<rect x="${m}" y="${m}" width="${plan.width - m * 2}" height="${plan.height - m * 2}" fill="none" stroke="#8a95a1" stroke-width="1.2"/>`;
  const outer = `<rect x="1" y="1" width="${plan.width - 2}" height="${plan.height - 2}" fill="none" stroke="#8a95a1" stroke-width="1"/>`;
  const columns = grid.columns
    .map((letter, index) => {
      const left = m + index * grid.cellWidth;
      const cx = left + grid.cellWidth / 2;
      const tick = `<line x1="${round(left)}" y1="1" x2="${round(left)}" y2="${m}" stroke="#8a95a1" stroke-width="1"/><line x1="${round(left)}" y1="${plan.height - m}" x2="${round(left)}" y2="${plan.height - 1}" stroke="#8a95a1" stroke-width="1"/>`;
      return `${tick}${svgText(round(cx), m - 6, letter, 8, 600, 'middle', '#66717f')}${svgText(round(cx), plan.height - m + 12, letter, 8, 600, 'middle', '#66717f')}`;
    })
    .join('');
  const rows = grid.rows
    .map((digit, index) => {
      const top = m + index * grid.cellHeight;
      const cy = top + grid.cellHeight / 2;
      const tick = `<line x1="1" y1="${round(top)}" x2="${m}" y2="${round(top)}" stroke="#8a95a1" stroke-width="1"/><line x1="${plan.width - m}" y1="${round(top)}" x2="${plan.width - 1}" y2="${round(top)}" stroke="#8a95a1" stroke-width="1"/>`;
      return `${tick}${svgText(m / 2, round(cy + 3), digit, 8, 600, 'middle', '#66717f')}${svgText(plan.width - m / 2, round(cy + 3), digit, 8, 600, 'middle', '#66717f')}`;
    })
    .join('');
  return `<g class="grid-frame">${outer}${inner}${columns}${rows}</g>`;
}

/** Rend la planche en SVG autonome. */
export function renderDiagramSvg(plan: DiagramPlan, labels: DiagramLabels = FR_LABELS): string {
  const frames = plan.frames
    .map((frame) => `<rect x="${round(frame.x)}" y="${round(frame.y)}" width="${round(frame.width)}" height="${round(frame.height)}" rx="3" fill="none" stroke="#9aa5b1" stroke-width="1.1" stroke-dasharray="8 4 2 4"/>${frame.label ? svgText(frame.x + 2, frame.y - 6, frame.label, 8.5, 700, 'start', '#66717f') : ''}`)
    .join('');
  const wires = plan.wires.map(renderWire).join('');
  const junctions = plan.junctions.map((point) => `<circle cx="${round(point.x)}" cy="${round(point.y)}" r="2.8" fill="${INK_COLOR}"/>`).join('');
  const symbols = plan.symbols.map(drawSymbol).join('');
  const captions = plan.captions
    .map((item) => svgText(round(item.x), round(item.y), item.text, item.size, item.weight, item.anchor, TONE[item.tone]))
    .join('');
  const border = plan.grid
    ? renderGridFrame(plan)
    : `<rect x="6" y="6" width="${plan.width - 12}" height="${plan.height - 12}" fill="none" stroke="#b7c0ca" stroke-width="1.2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${plan.width}" height="${plan.height}" viewBox="0 0 ${plan.width} ${plan.height}" role="img" aria-label="${escapeXml(labels.titleSheet)}">
  <title>${escapeXml(plan.title.project)} — ${escapeXml(labels.titleSheet)}</title>
  <rect width="${plan.width}" height="${plan.height}" fill="#ffffff"/>
  ${border}
  <g class="frames">${frames}</g>
  <g class="wires">${wires}${junctions}</g>
  <g class="symbols">${symbols}</g>
  <g class="captions">${captions}</g>
  ${renderLegend(plan, labels)}
  ${renderTitleBlock(plan, labels)}
</svg>`;
}
