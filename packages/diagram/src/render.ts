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
import { LEGEND_ROW, LEGEND_WIDTH, MARGIN, TITLE_HEIGHT } from './layout/constants.js';

/**
 * Émission du SVG.
 *
 * Le rendu est une pure fonction de la planche : mêmes entrées, même chaîne,
 * au caractère près. C'est ce qui en fait une pièce de dossier — vectorielle
 * à l'impression, comparable en test golden — plutôt qu'une capture d'écran.
 */

const TONE: Record<Caption['tone'], string> = {
  ink: INK_COLOR,
  muted: '#66717f',
  accent: '#0b6a5f',
};

const isConductor = (kind: LegendRow['kind']): kind is ConductorKind =>
  kind === 'dc-positive' || kind === 'dc-negative' || kind === 'ac' || kind === 'earth' || kind === 'signal';

function renderWire(wire: Wire): { path: string; label: string } {
  const color = CONDUCTOR_COLOR[wire.conductor];
  const width = CONDUCTOR_WIDTH[wire.conductor];
  const dash =
    wire.conductor === 'earth' ? ' stroke-dasharray="9 4"' : wire.dashed ? ' stroke-dasharray="6 5"' : '';
  const points = wire.points.map((point) => `${round(point.x)},${round(point.y)}`).join(' ');
  const path = `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="square" stroke-linejoin="miter"${dash}/>`;

  if (!wire.annotation) return { path, label: '' };

  // La cote se pose au milieu du plus long segment.
  let best = { length: -1, x: 0, y: 0, vertical: false };
  for (let index = 1; index < wire.points.length; index += 1) {
    const a = wire.points[index - 1]!;
    const b = wire.points[index]!;
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (length > best.length) {
      best = {
        length,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        vertical: Math.abs(b.y - a.y) > Math.abs(b.x - a.x),
      };
    }
  }
  const label = svgText(
    best.x + (best.vertical ? 7 : 0),
    best.y - (best.vertical ? 0 : 5),
    wire.annotation,
    8,
    600,
    best.vertical ? 'start' : 'middle',
    '#3d4753',
  );
  return { path, label };
}

/** Vignette de légende : le symbole réel, réduit, pour éviter toute divergence. */
function legendIcon(kind: SymbolKind, x: number, y: number): string {
  const size = SYMBOL_SIZE[kind];
  const scale = Math.min(22 / size.width, 22 / size.height);
  const sample: PlacedSymbol = {
    id: `legend-${kind}`,
    kind,
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    reference: null,
    caption: null,
    data: {},
  };
  const inner = drawSymbol(sample).replace(/^<g[^>]*>/, '').replace(/<\/g>$/, '');
  const dx = x + (26 - size.width * scale) / 2;
  const dy = y + (24 - size.height * scale) / 2;
  return `<g transform="translate(${round(dx)} ${round(dy)}) scale(${round(scale)})">${inner}</g>`;
}

function renderLegend(plan: DiagramPlan, labels: DiagramLabels, x: number, y: number): string {
  const height = plan.legend.length * LEGEND_ROW + 30;
  const rows = plan.legend
    .map((row, index) => {
      const rowY = y + 26 + index * LEGEND_ROW;
      const icon = isConductor(row.kind)
        ? `<line x1="${x + 12}" y1="${rowY + 6}" x2="${x + 36}" y2="${rowY + 6}" stroke="${CONDUCTOR_COLOR[row.kind]}" stroke-width="${CONDUCTOR_WIDTH[row.kind]}"${row.kind === 'earth' ? ' stroke-dasharray="9 4"' : ''}/>`
        : legendIcon(row.kind, x + 10, rowY - 6);
      return `${icon}${svgText(x + 46, rowY + 9, row.label, 8.5, 600, 'start', '#3d4753')}`;
    })
    .join('');
  return `
    <g>
      <rect x="${x}" y="${y}" width="${LEGEND_WIDTH}" height="${height}" rx="3" fill="#ffffff" stroke="#c3ccd6" stroke-width="1.2"/>
      ${svgText(x + 12, y + 16, labels.legend, 9.5, 700, 'start', INK_COLOR)}
      ${rows}
    </g>`;
}

function renderTitleBlock(
  plan: DiagramPlan,
  labels: DiagramLabels,
  x: number,
  y: number,
  width: number,
): string {
  const { title } = plan;
  const cellW = width / 3;
  const cells: readonly (readonly [string, string])[] = [
    [labels.titleProject, title.project],
    [labels.titleClient, title.client],
    [labels.titleReference, title.reference],
    [labels.titleLocation, title.location],
    [labels.titleDate, title.date],
    [labels.titleAuthor, title.author],
  ];
  const grid = cells
    .map(([label, value], index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const cx = x + column * cellW;
      const cy = y + 24 + row * 27;
      return `
        <rect x="${round(cx)}" y="${round(cy)}" width="${round(cellW)}" height="27" fill="none" stroke="#d6dde5" stroke-width="1"/>
        ${svgText(cx + 8, cy + 11, label.toUpperCase(), 6.5, 700, 'start', '#8b95a1')}
        ${svgText(cx + 8, cy + 22, value || '—', 9, 600, 'start', INK_COLOR)}`;
    })
    .join('');
  const heading = [title.company, labels.titleSheet].filter(Boolean).join(' — ');
  return `
    <g>
      <rect x="${x}" y="${y}" width="${round(width)}" height="${TITLE_HEIGHT}" fill="#ffffff" stroke="#9aa5b1" stroke-width="1.4"/>
      ${svgText(x + 8, y + 16, heading, 8.5, 700, 'start', INK_COLOR)}
      ${svgText(x + width - 8, y + 16, `${labels.titlePlate} ${title.sheet}`, 8, 600, 'end', '#66717f')}
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
      const cx = m + index * grid.cell + grid.cell / 2;
      const tick = `<line x1="${m + index * grid.cell}" y1="1" x2="${m + index * grid.cell}" y2="${m}" stroke="#8a95a1" stroke-width="1"/>
        <line x1="${m + index * grid.cell}" y1="${plan.height - m}" x2="${m + index * grid.cell}" y2="${plan.height - 1}" stroke="#8a95a1" stroke-width="1"/>`;
      return `${tick}${svgText(cx, m - 6, letter, 8, 600, 'middle', '#66717f')}${svgText(cx, plan.height - m + 12, letter, 8, 600, 'middle', '#66717f')}`;
    })
    .join('');

  const rows = grid.rows
    .map((digit, index) => {
      const cy = m + index * grid.cell + grid.cell / 2;
      const tick = `<line x1="1" y1="${m + index * grid.cell}" x2="${m}" y2="${m + index * grid.cell}" stroke="#8a95a1" stroke-width="1"/>
        <line x1="${plan.width - m}" y1="${m + index * grid.cell}" x2="${plan.width - 1}" y2="${m + index * grid.cell}" stroke="#8a95a1" stroke-width="1"/>`;
      return `${tick}${svgText(m - 6, cy + 3, digit, 8, 600, 'middle', '#66717f')}${svgText(plan.width - m + 8, cy + 3, digit, 8, 600, 'middle', '#66717f')}`;
    })
    .join('');

  return `<g class="grid-frame">${outer}${inner}${columns}${rows}</g>`;
}

/** Rend la planche en SVG autonome. */
export function renderDiagramSvg(plan: DiagramPlan, labels: DiagramLabels = FR_LABELS): string {
  const frames = plan.frames
    .map(
      (frame) => `
        <g>
          <rect x="${round(frame.x)}" y="${round(frame.y)}" width="${round(frame.width)}" height="${round(frame.height)}" rx="3" fill="none" stroke="#9aa5b1" stroke-width="1.1" stroke-dasharray="8 4 2 4"/>
          ${frame.label ? svgText(frame.x + 2, frame.y - 6, frame.label, 8.5, 700, 'start', '#66717f') : ''}
        </g>`,
    )
    .join('');

  const rendered = plan.wires.map(renderWire);
  const wires = rendered.map((item) => item.path).join('');
  const wireLabels = rendered.map((item) => item.label).join('');
  const symbols = plan.symbols.map(drawSymbol).join('');
  const captions = plan.captions
    .map((item) => svgText(item.x, item.y, item.text, item.size, item.weight, item.anchor, TONE[item.tone]))
    .join('');

  const footerY =
    plan.height -
    MARGIN -
    Math.max(plan.legend.length * LEGEND_ROW + 30, plan.showTitleBlock ? TITLE_HEIGHT : 0);
  const legend = plan.legend.length > 0 ? renderLegend(plan, labels, MARGIN, footerY) : '';
  const titleWidth = Math.min(430, plan.width - MARGIN * 2 - LEGEND_WIDTH - 30);
  const titleBlock = plan.showTitleBlock
    ? renderTitleBlock(plan, labels, plan.width - MARGIN - titleWidth, footerY, titleWidth)
    : '';
  const border = plan.grid
    ? renderGridFrame(plan)
    : `<rect x="${MARGIN / 2}" y="${MARGIN / 2}" width="${plan.width - MARGIN}" height="${plan.height - MARGIN}" fill="none" stroke="#b7c0ca" stroke-width="1.2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${plan.width}" height="${plan.height}" viewBox="0 0 ${plan.width} ${plan.height}" role="img" aria-label="${escapeXml(labels.titleSheet)}">
  <title>${escapeXml(plan.title.project)} — ${escapeXml(labels.titleSheet)}</title>
  <rect width="${plan.width}" height="${plan.height}" fill="#ffffff"/>
  ${border}
  <g class="frames">${frames}</g>
  <g class="wires">${wires}</g>
  <g class="symbols">${symbols}</g>
  <g class="captions">${captions}${wireLabels}</g>
  ${legend}
  ${titleBlock}
</svg>`;
}
