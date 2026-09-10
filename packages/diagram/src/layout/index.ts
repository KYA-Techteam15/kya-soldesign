import type {
  BillOfMaterialRow,
  DiagramPlan,
  GridFrame,
  LegendRow,
  PlacedSymbol,
  SheetFormat,
  SingleLineTopology,
} from '../contracts.js';
import type { DiagramLabels } from '../labels.js';
import { FR_LABELS } from '../labels.js';
import { SYMBOL_SIZE, anchorOf } from '../symbols.js';
import { Builder, amps, cableNote, num, vhv } from './builder.js';
import {
  BAND_GAP,
  EARTH_LANE,
  GRID_CELL,
  GRID_MARGIN,
  GROUP_GAP,
  LABEL_HEADROOM,
  LEGEND_ROW,
  LEGEND_WIDTH,
  MARGIN,
  SMALLEST_TEXT_PX,
  SOURCE_LANE,
  SHEETS,
  TITLE_HEIGHT,
  USABLE_HEIGHT_MM,
  USABLE_MM,
} from './constants.js';
import { layoutAcLine } from './ac-line.js';
import { layoutBattery, measureBattery } from './battery.js';
import { layoutEarth } from './earth.js';
import { layoutPvField, measureFieldHeight, measureGroup } from './pv-field.js';
import type { Bands, Lanes } from './types.js';

/**
 * Orchestration de la planche.
 *
 * Le placement suit les bandes imposées par l'installation — champ continu en
 * haut, conversion au milieu, distribution en bas, terre en pied, stockage en
 * dérivation latérale. Chaque bande vit dans son module ; cette fonction ne
 * fait que mesurer, ordonner et assembler.
 */
export function layoutDiagram(
  topology: SingleLineTopology,
  labels: DiagramLabels = FR_LABELS,
): DiagramPlan {
  const { options } = topology;
  const build = new Builder(labels);

  const groupWidths = topology.inverters.map((unit) => measureGroup(unit, options));
  const mainWidth =
    groupWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, groupWidths.length - 1) * GROUP_GAP;
  const battery = measureBattery(topology.battery, options);
  const needsSourceLane = topology.ac.transferSwitch !== null;

  const leftLane = topology.battery ? battery.width + 128 : needsSourceLane ? SOURCE_LANE : 0;
  const lanes: Lanes = {
    mainX: MARGIN + leftLane,
    mainWidth,
    earthX: MARGIN + leftLane + mainWidth + EARTH_LANE / 2,
    batteryX: MARGIN + 18,
    batteryWidth: battery.width,
    sourceX: MARGIN + 24,
  };

  const bands = measureBands(topology);

  const outlets = topology.inverters.map((unit, index) => {
    const groupX = lanes.mainX + groupWidths.slice(0, index).reduce((sum, value) => sum + value + GROUP_GAP, 0);
    return layoutPvField(
      build,
      unit,
      index,
      groupX,
      groupWidths[index] ?? 0,
      bands,
      options,
      topology.field,
      topology.inverters.length > 1,
    );
  });

  const inverterSymbols: PlacedSymbol[] = topology.inverters.map((unit, index) => {
    const outlet = outlets[index]!;
    const labels = build.labels;

    let plus = outlet.plus;
    let minus = outlet.minus;

    if (unit.chargeController) {
      const cw = SYMBOL_SIZE['charge-controller'].width;
      const controller = build.place('charge-controller', outlet.centerX - cw / 2, bands.yController, {
        reference: unit.chargeController.reference,
        caption: unit.chargeController.kind,
      });
      build.wire('dc-positive', vhv(plus, { x: controller.x + 26, y: bands.yController }, bands.yController - 20));
      build.wire('dc-negative', vhv(minus, { x: controller.x + cw - 26, y: bands.yController }, bands.yController - 12));
      build.item(unit.chargeController.reference, unit.chargeController.kind, unit.chargeController.voltageV === null ? '—' : `${Math.round(unit.chargeController.voltageV)} V`, 1);
      plus = { x: controller.x + 26, y: bands.yController + controller.height };
      minus = { x: controller.x + cw - 26, y: bands.yController + controller.height };
    }

    const invW = SYMBOL_SIZE.inverter.width;
    const inverter = build.place('inverter', outlet.centerX - invW / 2, bands.yInverter, {
      id: unit.id,
      reference: unit.reference,
      caption: unit.powerKw === null ? null : `${num(unit.powerKw, 1, labels)} kW`,
    });
    build.wire('dc-positive', vhv(plus, anchorOf(inverter, 'dc-plus'), bands.yInverter - 32), {
      annotation: cableNote(unit.dcCable),
    });
    build.wire('dc-negative', vhv(minus, anchorOf(inverter, 'dc-minus'), bands.yInverter - 18));
    build.item(
      unit.reference,
      unit.product ?? labels.inverter,
      unit.powerKw === null ? '—' : `${num(unit.powerKw, 1, labels)} kW`,
      1,
    );
    return inverter;
  });

  if (topology.battery && inverterSymbols[0]) {
    layoutBattery(build, topology.battery, inverterSymbols[0], bands, lanes, options);
  }

  const { earthTaps } = layoutAcLine(build, topology.ac, inverterSymbols, bands, lanes);

  // Le collecteur de terre longe la planche à droite de tout le reste. Sa
  // colonne ne peut donc être arrêtée qu'ici, une fois les libellés posés :
  // calculée d'avance sur la seule largeur des symboles, elle ferait passer
  // le collecteur au travers des annotations d'appareils.
  const earthLanes: Lanes = { ...lanes, earthX: build.rightExtent() + EARTH_LANE / 2 };
  layoutEarth(build, topology.earth, earthTaps, inverterSymbols, bands, earthLanes);

  /* ---- Enveloppe : cadre de repérage, légende, cartouche ----------------- */

  const legend = buildLegend(topology, labels);
  const legendHeight = options.showLegend ? legend.length * LEGEND_ROW + 30 : 0;
  const footerHeight = Math.max(legendHeight, options.showTitleBlock ? TITLE_HEIGHT : 0);
  const bodyBottom = Math.max(bands.contentBottom, bands.yBusbar + 190);

  const gridPad = options.showGridFrame ? GRID_MARGIN : 0;
  // La planche est bordée d'après ce qui y est réellement tracé, annotations
  // comprises : c'est la seule mesure qui garantisse qu'aucun texte ne sorte.
  const width = Math.round(
    Math.max(build.rightExtent() + MARGIN, MARGIN * 2 + LEGEND_WIDTH + 340) + gridPad * 2,
  );
  const height = Math.round(bodyBottom + 34 + footerHeight + MARGIN + gridPad * 2);

  const grid: GridFrame | null = options.showGridFrame
    ? {
        columns: Array.from({ length: Math.max(1, Math.floor((width - gridPad * 2) / GRID_CELL)) }, (_, index) =>
          String.fromCharCode(65 + (index % 26)),
        ),
        rows: Array.from({ length: Math.max(1, Math.floor((height - gridPad * 2) / GRID_CELL)) }, (_, index) =>
          String(index + 1),
        ),
        cell: GRID_CELL,
        margin: GRID_MARGIN,
      }
    : null;

  // Le champ PV n'a pas de symbole unique : son repérage vient de son cadre.
  const anchors = new Map<string, { x: number; y: number }>();
  for (const frame of build.frames) {
    if (frame.id.startsWith('frame-pv')) anchors.set('G1', { x: frame.x, y: frame.y });
  }
  const bom = withGridReferences(build.bom, build.symbols, anchors, grid);

  // Une planche s'inscrit dans la page par son côté le plus contraignant. Ne
  // rapporter que la largeur laisserait passer un plan haut et étroit — le cas
  // ordinaire d'un unifilaire — en le déclarant lisible alors que la réduction
  // en hauteur l'aura rendu illisible.
  const smallest = smallestLegibleSheet(width, height);
  const format = options.format === 'auto' ? (smallest ?? LARGEST_SHEET) : options.format;
  const smallestTextPt = textPtAt(format, width, height);

  const issues = [...topology.issues];
  if (smallestTextPt < LEGIBLE_PT) {
    const remedy = smallest
      ? ` La planche ${FORMAT_LABEL[smallest]} suffirait.`
      : ' Condenser le champ en représentation synoptique.';
    issues.push({
      level: 'warning',
      message:
        `À l’échelle ${FORMAT_LABEL[format]}, le plus petit texte tombe à ${smallestTextPt.toFixed(1)} pt. ` +
        `En dessous de ${LEGIBLE_PT} pt le plan n’est plus lisible imprimé.${remedy}`,
    });
  }

  return {
    width,
    height,
    format,
    symbols: build.symbols,
    wires: build.wires,
    frames: build.frames,
    captions: build.captions,
    legend,
    bom,
    grid,
    title: topology.title,
    showTitleBlock: options.showTitleBlock,
    issues,
    smallestTextPt,
  };
}

const FORMAT_LABEL: Readonly<Record<SheetFormat, string>> = {
  'a4-portrait': 'A4 portrait',
  'a4-landscape': 'A4 paysage',
  'a3-portrait': 'A3 portrait',
  'a3-landscape': 'A3 paysage',
  'a2-portrait': 'A2 portrait',
  'a2-landscape': 'A2 paysage',
};

/** Corps typographique minimal en dessous duquel un plan imprimé n'est plus lu. */
const LEGIBLE_PT = 6;

const LARGEST_SHEET: SheetFormat = SHEETS[SHEETS.length - 1]!.format;

/**
 * Corps du plus petit texte de la planche une fois celle-ci réduite à la page,
 * en points typographiques. La réduction retenue est celle qui fait entrer la
 * planche entière : le plus contraignant des deux rapports.
 */
function textPtAt(format: SheetFormat, width: number, height: number): number {
  const fit = Math.min(USABLE_MM(format) / width, USABLE_HEIGHT_MM(format) / height);
  return (SMALLEST_TEXT_PX * fit * 72) / 25.4;
}

/**
 * Plus petite planche normalisée sur laquelle le plan reste lisible, ou `null`
 * si même la plus grande n'y suffit pas — auquel cas c'est le dessin qu'il
 * faut condenser, pas le papier qu'il faut agrandir.
 */
function smallestLegibleSheet(width: number, height: number): SheetFormat | null {
  for (const sheet of SHEETS) {
    if (textPtAt(sheet.format, width, height) >= LEGIBLE_PT) return sheet.format;
  }
  return null;
}

/** Ordonnées des bandes. Une bande absente n'occupe aucune hauteur. */
function measureBands(topology: SingleLineTopology): Bands {
  const { options } = topology;
  const maxModules = Math.max(
    1,
    ...topology.inverters.flatMap((unit) =>
      unit.inputs.flatMap((input) => input.strings.map((item) => item.modules)),
    ),
  );
  const pvHeight = measureFieldHeight(maxModules, options);

  const has = {
    fuse: topology.inverters.some((unit) => unit.stringFuse !== null),
    combiner: topology.inverters.some((unit) => unit.combiner),
    spd: topology.inverters.some((unit) => unit.dcSpd !== null),
    dcSwitch: topology.inverters.some((unit) => unit.dcSwitch !== null),
    controller: topology.inverters.some((unit) => unit.chargeController !== null),
    acBreaker: topology.ac.breaker !== null,
    acSpd: topology.ac.spd !== null,
    rcd: topology.ac.rcd !== null,
    transfer: topology.ac.transferSwitch !== null,
  };

  let cursor = MARGIN + LABEL_HEADROOM;
  const yField = cursor;
  cursor += pvHeight;

  const step = (present: boolean, symbolHeight: number): number => {
    if (!present) return cursor;
    cursor += BAND_GAP;
    const at = cursor;
    cursor += symbolHeight;
    return at;
  };

  const yFuse = step(has.fuse, SYMBOL_SIZE['dc-fuse'].height);
  const yCombiner = step(has.combiner, SYMBOL_SIZE.combiner.height);
  const ySpd = step(has.spd, SYMBOL_SIZE['dc-spd'].height);
  const ySwitch = step(has.dcSwitch, SYMBOL_SIZE['dc-switch'].height);
  const yController = step(has.controller, SYMBOL_SIZE['charge-controller'].height);
  const yInverter = step(true, SYMBOL_SIZE.inverter.height);
  const yAcBreaker = step(has.acBreaker, SYMBOL_SIZE['ac-breaker'].height);
  const yAcSpd = step(has.acSpd, SYMBOL_SIZE['ac-spd'].height);
  const yRcd = step(has.rcd, SYMBOL_SIZE.rcd.height);
  const yTransfer = step(has.transfer, SYMBOL_SIZE['transfer-switch'].height);
  const yBusbar = step(true, SYMBOL_SIZE.busbar.height);
  cursor += BAND_GAP - 10;
  const yLoad = cursor;
  cursor += SYMBOL_SIZE.load.height;

  return {
    yField,
    pvHeight,
    yFuse,
    yCombiner,
    ySpd,
    ySwitch,
    yController,
    yInverter,
    yAcBreaker,
    yAcSpd,
    yRcd,
    yTransfer,
    yBusbar,
    yLoad,
    contentBottom: cursor,
  };
}

/** Complète la nomenclature avec la case du cadre où trouver chaque appareil. */
function withGridReferences(
  rows: readonly BillOfMaterialRow[],
  symbols: readonly PlacedSymbol[],
  extra: ReadonlyMap<string, { x: number; y: number }>,
  grid: GridFrame | null,
): BillOfMaterialRow[] {
  if (!grid) return rows.map((row) => ({ ...row }));
  const byReference = new Map<string, { x: number; y: number }>(extra);
  for (const symbol of symbols) {
    if (symbol.reference && !byReference.has(symbol.reference)) {
      byReference.set(symbol.reference, { x: symbol.x, y: symbol.y });
    }
  }
  return rows.map((row) => {
    const at = byReference.get(row.reference);
    if (!at) return { ...row };
    const column = grid.columns[Math.min(grid.columns.length - 1, Math.floor(at.x / grid.cell))] ?? '';
    const line = grid.rows[Math.min(grid.rows.length - 1, Math.floor(at.y / grid.cell))] ?? '';
    return { ...row, gridRef: `${column}${line}` };
  });
}

function buildLegend(topology: SingleLineTopology, labels: DiagramLabels): LegendRow[] {
  const rows: LegendRow[] = [{ kind: 'pv-module', label: labels.pvField }];
  if (topology.inverters.some((unit) => unit.stringFuse)) rows.push({ kind: 'dc-fuse', label: labels.stringFuse });
  if (topology.inverters.some((unit) => unit.dcSpd)) rows.push({ kind: 'dc-spd', label: labels.spdType2 });
  if (topology.inverters.some((unit) => unit.dcSwitch)) rows.push({ kind: 'dc-switch', label: labels.dcSwitch });
  if (topology.inverters.some((unit) => unit.chargeController)) {
    rows.push({ kind: 'charge-controller', label: labels.chargeController });
  }
  rows.push({ kind: 'inverter', label: labels.inverter });
  if (topology.battery) rows.push({ kind: 'battery', label: labels.batteryBank });
  if (topology.ac.rcd) rows.push({ kind: 'rcd', label: labels.rcd });
  if (topology.ac.meter) rows.push({ kind: 'meter', label: labels.meter });
  if (topology.ac.transferSwitch) rows.push({ kind: 'transfer-switch', label: labels.transferSwitch });
  if (topology.ac.grid) rows.push({ kind: 'grid', label: labels.grid });
  if (topology.ac.generator) rows.push({ kind: 'generator', label: labels.generator });
  rows.push({ kind: LOAD_LEGEND[topology.ac.loadKind], label: topology.ac.loadLabel });
  rows.push({ kind: 'earth-electrode', label: labels.earthElectrode });
  rows.push({ kind: 'dc-positive', label: labels.conductorPlus });
  rows.push({ kind: 'dc-negative', label: labels.conductorMinus });
  rows.push({ kind: 'ac', label: labels.conductorAc });
  rows.push({ kind: 'earth', label: labels.conductorEarth });
  return rows;
}

const LOAD_LEGEND = { building: 'load', pump: 'pump', 'street-light': 'street-light' } as const;

export { amps };
