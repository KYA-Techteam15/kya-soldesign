import type {
  BillOfMaterialRow,
  DiagramPlan,
  GridFrame,
  InverterUnitSpec,
  LegendRow,
  PlacedSymbol,
  Point,
  ProtectionSpec,
  SheetFormat,
  SingleLineTopology,
  SymbolKind,
} from '../contracts.js';
import type { DiagramLabels } from '../labels.js';
import { FR_LABELS } from '../labels.js';
import { SYMBOL_SIZE, anchorOf } from '../symbols.js';
import { Builder, amps, cableNote, collapse, num, quantity, type LabelLine } from './builder.js';
import type { Box } from './geometry.js';
import {
  GRID_COLUMNS,
  GRID_MARGIN,
  GRID_ROWS,
  LEGEND_COLUMN_WIDTH,
  LEGEND_ROW,
  LEGEND_ROWS_PER_COLUMN,
  MARGIN,
  SHEETS,
  SMALLEST_TEXT_PX,
  TITLE_HEIGHT,
  TITLE_WIDTH,
  USABLE_HEIGHT_MM,
  USABLE_MM,
} from './constants.js';

/**
 * Placement de la planche, en paysage et de gauche à droite (spec 012, FR-B1).
 *
 * Le courant se lit comme une phrase : champ photovoltaïque, protection de tête, onduleur,
 * protections alternatives, tableau, charges. Le stockage pend sous l'onduleur, les parafoudres
 * descendent en dérivation vers le conducteur de protection, qui court en pied de dessin jusqu'à la
 * borne principale de terre. Chaque liaison est un trait unique marqué de son nombre de conducteurs.
 * Les étiquettes sont posées en dernier, là où elles ne touchent rien.
 */

const MODULE = SYMBOL_SIZE['pv-module'];
const STRING_GAP = 24;
const SLOT_GAP = 24;
const SHUNT_DROP = 30;
const EARTH_GAP = 46;
const LEGIBLE_PT = 6;
/** Rapport de la surface imprimable des planches A4 et A3 paysage (267 × 182, 390 × 267 mm). */
const LANDSCAPE_RATIO = 1.46;

const heading = (text: string): LabelLine => ({ text, size: 9, weight: 700, tone: 'ink' });
const detail = (text: string): LabelLine => ({ text, size: 8, weight: 600, tone: 'muted' });

/** Coupe un texte long en lignes d'au plus `max` caractères, sans couper les mots. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/u)) {
    if (current && `${current} ${word}`.length > max) { lines.push(current); current = word; } else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

/** Symbole d'un appareil de protection, d'après sa nature. */
function protectionSymbol(spec: ProtectionSpec, current: 'dc' | 'ac'): SymbolKind {
  if (spec.nature === 'fuse-switch') return 'fuse-switch';
  if (spec.nature === 'fuse') return 'dc-fuse';
  if (spec.nature === 'breaker') return current === 'dc' ? 'dc-breaker' : 'ac-breaker';
  return 'dc-switch';
}

/** Désignation de l'appareil tel qu'il est dessiné : la nomenclature et le plan disent la même chose. */
function designation(spec: ProtectionSpec, labels: DiagramLabels): string {
  return spec.nature === 'fuse-switch' ? `${labels.fuseSwitch} ${/gG/u.test(spec.kind) ? 'gG' : 'gPV'}` : spec.kind;
}

function protectionLines(spec: ProtectionSpec, labels: DiagramLabels): LabelLine[] {
  return [heading(spec.reference), detail(designation(spec, labels)), detail(`${spec.poles}P · ${amps(spec.ratingA, labels)}`)];
}

export function layoutDiagram(topology: SingleLineTopology, labels: DiagramLabels = FR_LABELS): DiagramPlan {
  const { options } = topology;
  const b = new Builder(labels);
  const unit = topology.inverters[0]!;
  const unitCount = topology.inverters.length;
  const earthTaps: Point[] = [];
  /* Synoptique : repères et calibres seulement, la légende nomme les symboles. C'est ce qui fait
     tenir la planche lisible sur une page A4 de rapport. */
  const compact = options.detail === 'synoptic';
  const slotGap = compact ? 12 : SLOT_GAP;
  const deviceLines = (spec: ProtectionSpec): LabelLine[] => compact ? [heading(`${spec.reference} · ${amps(spec.ratingA, labels)}`)] : protectionLines(spec, labels);

  /* ---- 1. Champ photovoltaïque ----------------------------------------- */
  const field = layoutField(b, topology, unit, options.detail === 'synoptic');
  earthTaps.push({ x: field.frame.x, y: field.frame.y + field.frame.height });
  const trunkY = field.outlet.y;
  let cursor = field.outlet.x;
  let previous: Point = field.outlet;

  /** Appareil en ligne : tourné, centré sur la liaison, étiqueté au-dessus. */
  const inline = (kind: SymbolKind, lines: readonly LabelLine[], conductor: 'dc' | 'ac', extra: { reference?: string; width?: number } = {}): PlacedSymbol => {
    const size = SYMBOL_SIZE[kind];
    const footprintW = extra.width ?? size.height;
    const slot = Math.max(footprintW, Builder.blockWidth(lines)) + slotGap;
    const x = cursor + (slot - footprintW) / 2;
    const symbol = b.place(kind, x, trunkY - size.width / 2, { rotation: -90, reference: extra.reference ?? null, width: footprintW });
    b.wire(conductor, [previous, { x, y: trunkY }]);
    b.label(lines, symbol, ['above', 'below']);
    previous = { x: x + footprintW, y: trunkY };
    cursor += slot;
    return symbol;
  };

  /** Liaison câblée : un tronçon assez long pour porter sa cote au-dessus. */
  const cable = (note: string | null, conductor: 'dc' | 'ac', conductors: number) => {
    const shown = options.showCableNotes ? note : null;
    const length = Math.max(36, shown ? Builder.blockWidth([shown]) + 16 : 0);
    const end = { x: cursor + length, y: trunkY };
    b.wire(conductor, [previous, end], { conductors });
    if (shown) b.label([detail(shown)], { x: cursor, y: trunkY - 1, width: length, height: 2 }, ['above', 'below'], 5);
    previous = end;
    cursor += length;
  };

  /** Parafoudre en dérivation : piquage sur la liaison, appareil, puis descente vers la terre. */
  const shunt = (spec: ProtectionSpec, conductor: 'dc' | 'ac') => {
    const nodeX = cursor + 16;
    b.wire(conductor, [previous, { x: nodeX, y: trunkY }]);
    b.junction({ x: nodeX, y: trunkY });
    const size = SYMBOL_SIZE[conductor === 'dc' ? 'dc-spd' : 'ac-spd'];
    const spd = b.place(conductor === 'dc' ? 'dc-spd' : 'ac-spd', nodeX - size.width / 2, trunkY + SHUNT_DROP, { reference: spec.reference });
    b.wire(conductor, [{ x: nodeX, y: trunkY }, anchorOf(spd, 'top')]);
    earthTaps.push(anchorOf(spd, 'bottom'));
    const lines = compact ? [heading(spec.reference)] : [heading(spec.reference), detail(spec.kind), spec.voltageV === null ? null : detail(`${Math.round(spec.voltageV)} V`)].filter((line): line is LabelLine => line !== null);
    b.label(lines, spd, ['right', 'left']);
    b.item(spec.reference, spec.kind, spec.voltageV === null ? '—' : `${Math.round(spec.voltageV)} V`, 1);
    previous = { x: nodeX, y: trunkY };
    cursor = nodeX + Math.max(34, Builder.blockWidth(lines) + 20);
  };

  /* ---- 2. Côté continu : protection de tête, câble, parafoudre --------- */
  cursor += 14;
  if (unit.dcSwitch) {
    inline(protectionSymbol(unit.dcSwitch, 'dc'), deviceLines(unit.dcSwitch), 'dc', { reference: unit.dcSwitch.reference });
    b.item(unit.dcSwitch.reference, designation(unit.dcSwitch, labels), `${unit.dcSwitch.poles}P · ${amps(unit.dcSwitch.ratingA, labels)}`, 1);
  }
  cable(cableNote(unit.dcCable, labels), 'dc', 2);
  if (unit.dcSpd) shunt(unit.dcSpd, 'dc');
  if (unit.chargeController) {
    const controller = inline('charge-controller', [heading(unit.chargeController.reference), detail(unit.chargeController.kind)], 'dc', {
      reference: unit.chargeController.reference,
      width: SYMBOL_SIZE['charge-controller'].width,
    });
    void controller;
    b.item(unit.chargeController.reference, unit.chargeController.kind, unit.chargeController.voltageV === null ? '—' : `${Math.round(unit.chargeController.voltageV)} V`, 1);
  }

  /* ---- 3. Onduleur ------------------------------------------------------ */
  // Place réservée sous la liaison pour les étiquettes du stockage, à gauche de sa descente.
  cursor += topology.battery ? (compact ? 44 : 56) : 16;
  const inverterLines: LabelLine[] = [
    heading(unitCount > 1 ? `${unit.reference}…O${unitCount}` : unit.reference),
    ...(compact ? [] : unit.product ? wrap(unit.product, 24).map(detail) : [detail(labels.inverter)]),
    unit.powerKw === null ? null : detail(unitCount > 1 ? `${unitCount} × ${num(unit.powerKw, 1, labels)} kW ${labels.inParallelUnits}` : `${num(unit.powerKw, 1, labels)} kW`),
  ].filter((line): line is LabelLine => line !== null);
  const inverterSize = SYMBOL_SIZE.inverter;
  const inverterSlot = Math.max(inverterSize.width, Builder.blockWidth(inverterLines)) + slotGap;
  const inverter = b.place('inverter', cursor + (inverterSlot - inverterSize.width) / 2, trunkY - inverterSize.height / 2, { id: unit.id, reference: unit.reference });
  b.wire('dc', [previous, anchorOf(inverter, 'left')]);
  b.label(inverterLines, inverter, ['above', 'below']);
  b.item(unit.reference, unit.product ?? labels.inverter, unit.powerKw === null ? '—' : `${num(unit.powerKw, 1, labels)} kW`, unitCount);
  previous = anchorOf(inverter, 'right');
  cursor += inverterSlot;
  // Masse de l'onduleur ramenée à la terre par son angle inférieur droit.
  earthTaps.push({ x: inverter.x + inverter.width - 12, y: inverter.y + inverter.height });

  /* ---- 4. Stockage, sous l'onduleur ------------------------------------- */
  let lowest = Math.max(field.frame.y + field.frame.height, trunkY + SHUNT_DROP + SYMBOL_SIZE['dc-spd'].height);
  if (topology.battery) {
    const bank = topology.battery;
    const axis = inverter.x + inverter.width / 2;
    let top: Point = anchorOf(inverter, 'bottom');
    if (bank.breaker) {
      const kind = protectionSymbol(bank.breaker, 'dc');
      const size = SYMBOL_SIZE[kind];
      const breaker = b.place(kind, axis - size.width / 2, top.y + (compact ? 18 : 26), { reference: bank.breaker.reference });
      b.wire('dc', [top, anchorOf(breaker, 'top')]);
      b.label(deviceLines(bank.breaker), breaker, ['left', 'right']);
      b.item(bank.breaker.reference, designation(bank.breaker, labels), `${bank.breaker.poles}P · ${amps(bank.breaker.ratingA, labels)}`, 1);
      top = anchorOf(breaker, 'bottom');
    }
    const note = options.showCableNotes ? cableNote(bank.cable, labels) : null;
    const batterySize = SYMBOL_SIZE.battery;
    const batteryTop = top.y + (note ? (compact ? 30 : 38) : 20);
    const battery = b.place('battery', axis - batterySize.height / 2, batteryTop, { rotation: -90, reference: 'B1', data: { bare: true } });
    b.wire('dc', [top, anchorOf(battery, 'top')], { conductors: 2 });
    if (note) b.label([detail(note)], { x: axis - 1, y: top.y, width: 2, height: battery.y - top.y }, ['left', 'right'], 6);
    const unitLabel = [bank.unitVoltageV === null ? null : `${quantity(bank.unitVoltageV, labels)} V`, bank.unitCapacityAh === null ? null : `${quantity(bank.unitCapacityAh, labels)} Ah`].filter(Boolean).join(' ');
    const matrix = bank.totalUnits > 1 ? `${bank.unitsInSeries} ${labels.inSeries} × ${bank.stringsInParallel} ${labels.inParallel}` : null;
    const summary = [bank.bankVoltageV === null ? null : `${Math.round(bank.bankVoltageV)} V`, bank.usefulEnergyKwh === null ? null : `${num(bank.usefulEnergyKwh, 1, labels)} ${labels.usefulEnergy}`].filter(Boolean).join(' · ');
    b.label([
      heading(`B1 · ${labels.batteryBank}`),
      detail(`${bank.totalUnits} × ${unitLabel || labels.unit}`),
      matrix && !compact ? detail(matrix) : null,
      summary ? detail(summary) : null,
      ...(bank.product && !compact ? wrap(bank.product, 30).map(detail) : []),
    ].filter((line): line is LabelLine => line !== null), battery, ['left', 'right'], 10);
    b.item('B1', bank.product ?? labels.batteryBank, [unitLabel, `${bank.unitsInSeries}S × ${bank.stringsInParallel}P`].filter(Boolean).join(' · '), bank.totalUnits);
    lowest = Math.max(lowest, battery.y + battery.height);
  }

  /* ---- 5. Côté alternatif ------------------------------------------------- */
  const ac = topology.ac;
  const acConductors = ac.loadKind === 'building' ? 3 : 2;
  if (ac.meter) {
    inline('meter', [heading('M1'), detail(labels.meter)], 'ac', { reference: 'M1' });
    b.item('M1', labels.meter, `${ac.voltageV ?? 230} V`, 1);
  }
  if (ac.transferSwitch) {
    const transfer = inline('transfer-switch', [heading(ac.transferSwitch.reference), detail(ac.transferSwitch.kind)], 'ac', { reference: ac.transferSwitch.reference });
    b.item(ac.transferSwitch.reference, ac.transferSwitch.kind, `${ac.voltageV ?? 230} V`, 1);
    const sourceKind: SymbolKind = ac.grid ? 'grid' : 'generator';
    const sourceSize = SYMBOL_SIZE[sourceKind];
    const source = b.place(sourceKind, transfer.x + transfer.width / 2 - sourceSize.width / 2, transfer.y + transfer.height + 40, { reference: ac.grid ? 'W1' : 'GE1' });
    b.wire('ac', [anchorOf(source, 'top'), { x: anchorOf(source, 'top').x, y: transfer.y + transfer.height }]);
    const sourceLabel = ac.grid?.label ?? ac.generator?.label ?? '';
    b.label([heading(ac.grid ? 'W1' : 'GE1'), detail(sourceLabel)], source, ['right', 'left']);
    b.item(ac.grid ? 'W1' : 'GE1', sourceLabel, `${ac.voltageV ?? 230} V`, 1);
    lowest = Math.max(lowest, source.y + source.height);
  }
  if (ac.breaker) {
    inline(protectionSymbol(ac.breaker, 'ac'), deviceLines(ac.breaker), 'ac', { reference: ac.breaker.reference });
    b.item(ac.breaker.reference, ac.breaker.kind, `${ac.breaker.poles}P · ${amps(ac.breaker.ratingA, labels)}`, 1);
  }
  if (ac.spd) shunt(ac.spd, 'ac');
  if (ac.rcd) {
    inline('rcd', compact ? [heading(`${ac.rcd.reference} · 30 mA`)] : [heading(ac.rcd.reference), detail(labels.rcd), detail(`${ac.rcd.poles}P · ${amps(ac.rcd.ratingA, labels)}`)], 'ac', { reference: ac.rcd.reference });
    b.item(ac.rcd.reference, ac.rcd.kind, amps(ac.rcd.ratingA, labels), 1);
  }
  cable(cableNote(ac.cable, labels), 'ac', acConductors);

  /* ---- 6. Tableau et charges -------------------------------------------- */
  const busbar = b.place('busbar', cursor, trunkY - 44, { rotation: -90, width: 8, height: 88 });
  b.wire('ac', [previous, { x: busbar.x, y: trunkY }]);
  b.label(compact ? [heading(labels.acBoard)] : [heading(labels.acBoard), detail(`${ac.voltageV ?? 230} V`)], busbar, ['above', 'below']);
  const loadKind: SymbolKind = ac.loadKind === 'pump' ? 'pump' : ac.loadKind === 'street-light' ? 'street-light' : 'load';
  const loadSize = ac.loadKind === 'building' ? { width: 84, height: 72 } : SYMBOL_SIZE[loadKind];
  const load = b.place(loadKind, busbar.x + busbar.width + 40, trunkY - loadSize.height / 2, { width: loadSize.width, height: loadSize.height });
  b.wire('ac', [{ x: busbar.x + busbar.width, y: trunkY }, { x: load.x + 6, y: trunkY }]);
  b.label([heading(ac.loadLabel)], load, ['below', 'above']);
  earthTaps.push({ x: load.x + 14, y: load.y + load.height - 6 });
  lowest = Math.max(lowest, load.y + load.height + 24);

  /* ---- 7. Terre ------------------------------------------------------------ */
  if (topology.earth.enabled) layoutEarth(b, topology, earthTaps, lowest + (compact ? 24 : EARTH_GAP), load.x + load.width);

  b.placeLabels();
  return assemble(topology, labels, b);
}

/** Champ PV : une colonne par chaîne (condensées au-delà du seuil), fusibles, collecteur. */
function layoutField(b: Builder, topology: SingleLineTopology, unit: InverterUnitSpec, synoptic: boolean): { frame: Box; outlet: Point } {
  const labels = b.labels;
  const { options } = topology;
  const strings = unit.inputs.flatMap((input) => input.strings);
  const drawn = synoptic ? { head: 1, tail: 0, hidden: 0 } : collapse(strings.length, options.maxDrawnStrings);
  const visible = [
    ...strings.slice(0, drawn.head),
    ...(drawn.hidden > 0 ? [null] : []),
    ...(drawn.tail > 0 ? strings.slice(-drawn.tail) : []),
  ];
  const maxModules = Math.max(1, ...strings.map((spec) => spec.modules));
  const run = collapse(maxModules, synoptic ? Math.min(3, options.maxDrawnModules) : options.maxDrawnModules);
  const columnHeight = (run.head + run.tail) * MODULE.height + (run.hidden > 0 ? SYMBOL_SIZE['series-break'].height : 0);

  const top = 0;
  let x = 0;
  const axes: number[] = [];
  for (const spec of visible) {
    if (spec === null) {
      const breakSize = SYMBOL_SIZE['parallel-break'];
      const symbol = b.place('parallel-break', x, top + columnHeight / 2 - breakSize.height / 2);
      b.label([detail(`+${drawn.hidden}`)], symbol, ['above', 'below'], 4);
      x += breakSize.width + STRING_GAP;
      continue;
    }
    let y = top;
    for (let index = 0; index < run.head; index += 1) { b.place('pv-module', x, y, { data: { label: String(index + 1) } }); y += MODULE.height; }
    if (run.hidden > 0) {
      const breakSymbol = b.place('series-break', x, y);
      b.label([detail(`×${run.hidden}`)], breakSymbol, ['right', 'left'], 2);
      y += SYMBOL_SIZE['series-break'].height;
    }
    for (let index = 0; index < run.tail; index += 1) { b.place('pv-module', x, y, { data: { label: String(spec.modules) } }); y += MODULE.height; }
    const reference = synoptic && strings.length > 1 ? `${strings.length} × ${spec.reference}` : spec.reference;
    b.label([{ text: reference, size: 9, weight: 700, tone: 'accent' }, spec.vocColdV === null || synoptic ? null : detail(`${Math.round(spec.vocColdV)} V`)].filter((line): line is LabelLine => line !== null), { x, y: top, width: MODULE.width, height: 1 }, ['above'], 4);
    axes.push(x + MODULE.width / 2);
    x += MODULE.width + STRING_GAP;
  }
  const columnsRight = x - STRING_GAP;
  let bottom = top + columnHeight;

  // Fusibles de chaîne (plusieurs chaînes en parallèle), puis collecteur au niveau de la liaison.
  const fuseLines: LabelLine[] = unit.stringFuse ? [heading(unit.stringFuse.reference), detail(unit.stringFuse.kind), detail(`${amps(unit.stringFuse.ratingA, labels)} · ×${unit.stringFuse.quantity}`)] : [];
  if (unit.stringFuse && !synoptic) {
    const fuse = SYMBOL_SIZE['dc-fuse'];
    const fuseTop = bottom + 18;
    let first: PlacedSymbol | null = null;
    for (const axis of axes) {
      const symbol = b.place('dc-fuse', axis - fuse.width / 2, fuseTop, { reference: first === null ? unit.stringFuse.reference : null });
      b.wire('dc', [{ x: axis, y: bottom }, anchorOf(symbol, 'top')]);
      first ??= symbol;
    }
    bottom = fuseTop + fuse.height;
    const last = b.symbols.at(-1);
    if (first && last) b.label(fuseLines, last, ['right', 'left']);
    b.item(unit.stringFuse.reference, unit.stringFuse.kind, amps(unit.stringFuse.ratingA, labels), unit.stringFuse.quantity);
  }
  const trunkY = bottom + 26;
  for (const axis of axes) b.wire('dc', [{ x: axis, y: bottom }, { x: axis, y: trunkY }]);
  // Avec des fusibles de chaîne, leur étiquette se pose à droite du dernier : la place est réservée.
  const fuseLabel = unit.stringFuse && !synoptic ? Builder.blockWidth(fuseLines) + 30 : 0;
  const outletX = Math.max(columnsRight + 22, (axes.at(-1) ?? 0) + 22 + fuseLabel);
  if (axes.length > 1) {
    for (const axis of axes.slice(0, -1)) b.junction({ x: axis, y: trunkY });
  }
  b.wire('dc', [{ x: axes[0] ?? 0, y: trunkY }, { x: outletX, y: trunkY }]);

  // Boîte de jonction : cadre autour des fusibles et du collecteur.
  if (unit.combiner && !synoptic) {
    const reference = `J${unit.reference.slice(1)}`;
    b.frame(`frame-combiner-${unit.reference}`, -12, top + columnHeight + 8, outletX + 4, trunkY - (top + columnHeight) + 4);
    b.item(reference, labels.combiner, `${axes.length} ${labels.strings}`, 1);
  }

  const headroom = synoptic ? 22 : 34;
  const frame: Box = { x: -14, y: top - headroom, width: columnsRight + (run.hidden > 0 ? 40 : 28), height: columnHeight + headroom + 8 };
  b.frame('frame-pv', frame.x, frame.y, frame.width, frame.height);
  const field = topology.field;
  b.label([
    heading(`${labels.pvField}${field.powerKwc === null ? '' : ` · ${num(field.powerKwc, 2, labels)} kWc`}`),
    detail(field.modulePowerW === null ? `${field.totalModules} modules` : `${field.totalModules} ${labels.modulesOf} ${field.modulePowerW} Wc`),
    synoptic ? null : detail(`${strings.length} ${strings.length > 1 ? labels.stringsOf : labels.stringOf} ${maxModules} ${labels.modules}`),
  ].filter((line): line is LabelLine => line !== null), frame, ['above', 'left'], 6);
  b.item('G1', field.product ?? labels.pvField, field.powerKwc === null ? '—' : `${num(field.powerKwc, 2, labels)} kWc`, field.totalModules);
  return { frame, outlet: { x: outletX, y: trunkY } };
}

/** Conducteur de protection en pied de dessin, borne principale, barrette et prise de terre. */
function layoutEarth(b: Builder, topology: SingleLineTopology, taps: readonly Point[], busY: number, rightEdge: number): void {
  const labels = b.labels;
  const { earth } = topology;
  const sorted = [...taps].sort((left, right) => left.x - right.x);
  for (const tap of sorted) {
    b.wire('earth', [tap, { x: tap.x, y: busY }]);
    b.junction({ x: tap.x, y: busY });
  }
  const barWidth = Math.max(52, sorted.length * 12 + 16);
  // La borne principale se range sous la fin du dessin, sans l'élargir : juste après le dernier piquage.
  const barX = Math.max(...sorted.map((tap) => tap.x)) + 22;
  void rightEdge;
  const bar = b.place('earth-bar', barX, busY - 7, { rotation: -90, width: barWidth, height: 14, data: { taps: sorted.length } });
  b.wire('earth', [{ x: sorted[0]?.x ?? barX, y: busY }, { x: bar.x, y: busY }]);
  b.label([heading(labels.mainEarthTerminal), earth.mainSectionMm2 === null ? null : detail(`PE ${earth.mainSectionMm2} mm²`)].filter((line): line is LabelLine => line !== null), bar, ['above', 'below']);
  b.item('PE', labels.mainEarthTerminal, earth.mainSectionMm2 === null ? '—' : `${earth.mainSectionMm2} mm²`, 1);

  // Barrette de mesure et prise de terre pendent sous l'extrémité de la borne : la terre ne
  // prolonge pas la planche au-delà des charges.
  const dropX = bar.x + bar.width - 12;
  let from: Point = { x: dropX, y: bar.y + bar.height };
  if (earth.cutoffLink) {
    const size = SYMBOL_SIZE['earth-link'];
    const link = b.place('earth-link', dropX - size.width / 2, from.y + 14, { reference: 'X1' });
    b.wire('earth', [from, anchorOf(link, 'top')]);
    b.label([heading('X1'), detail(labels.earthCutoff)], link, ['left', 'right']);
    b.item('X1', labels.earthCutoff, '—', 1);
    from = anchorOf(link, 'bottom');
  }
  const size = SYMBOL_SIZE['earth-electrode'];
  const electrode = b.place('earth-electrode', dropX - size.width / 2, from.y + 14, { reference: 'T1' });
  b.wire('earth', [from, anchorOf(electrode, 'top')]);
  b.label([heading('T1'), detail(labels.earthElectrode), earth.electrodeSectionMm2 === null ? null : detail(`${earth.electrodeSectionMm2} mm²`)].filter((line): line is LabelLine => line !== null), electrode, ['left', 'right']);
  b.item('T1', labels.earthElectrode, earth.electrodeSectionMm2 === null ? '—' : `${earth.electrodeSectionMm2} mm²`, 1);
}

/* -------------------------------------------------------------------------- */
/* Planche : centrage, bandeau de pied (légende, cartouche), cadre, format      */
/* -------------------------------------------------------------------------- */

function assemble(topology: SingleLineTopology, labels: DiagramLabels, b: Builder): DiagramPlan {
  const { options } = topology;
  const legend = buildLegend(topology, labels);
  const legendRows = options.detail === 'synoptic' ? 3 : LEGEND_ROWS_PER_COLUMN;
  const legendColumns = options.showLegend ? Math.ceil(legend.length / legendRows) : 0;
  const legendWidth = legendColumns * LEGEND_COLUMN_WIDTH;
  const legendHeight = options.showLegend ? legendRows * LEGEND_ROW + 26 : 0;
  const bandHeight = Math.max(legendHeight, options.showTitleBlock ? TITLE_HEIGHT : 0);
  const bandWidth = legendWidth + (options.showTitleBlock ? TITLE_WIDTH + 24 : 0);

  const content = b.extents();
  const gridPad = options.showGridFrame ? GRID_MARGIN : 0;
  const innerWidth = Math.max(content.width, bandWidth);
  const innerHeight = content.height + (bandHeight > 0 ? 34 + bandHeight : 0);
  let width = innerWidth + MARGIN * 2 + gridPad * 2;
  let height = innerHeight + MARGIN * 2 + gridPad * 2;
  // Une planche paysage au rapport de la surface imprimable : elle remplit la page sans perte.
  if (width / height < LANDSCAPE_RATIO) width = height * LANDSCAPE_RATIO; else height = width / LANDSCAPE_RATIO;
  width = Math.round(width);
  height = Math.round(height);

  const drawingTop = gridPad + MARGIN;
  const drawingHeight = height - gridPad * 2 - MARGIN * 2 - (bandHeight > 0 ? 34 + bandHeight : 0);
  const dx = (width - content.width) / 2 - content.x;
  const dy = drawingTop + Math.max(0, (drawingHeight - content.height) / 2) - content.y;
  b.shift(Math.round(dx), Math.round(dy));

  const footerY = height - gridPad - MARGIN - bandHeight;
  const footer = {
    legend: options.showLegend ? { x: gridPad + MARGIN, y: footerY, width: legendWidth, height: legendHeight, rows: legendRows } : null,
    title: options.showTitleBlock ? { x: width - gridPad - MARGIN - TITLE_WIDTH, y: footerY + bandHeight - TITLE_HEIGHT, width: TITLE_WIDTH, height: TITLE_HEIGHT } : null,
  };

  const grid: GridFrame | null = options.showGridFrame
    ? {
        columns: Array.from({ length: GRID_COLUMNS }, (_, index) => String.fromCharCode(65 + index)),
        rows: Array.from({ length: GRID_ROWS }, (_, index) => String(index + 1)),
        cellWidth: (width - GRID_MARGIN * 2) / GRID_COLUMNS,
        cellHeight: (height - GRID_MARGIN * 2) / GRID_ROWS,
        margin: GRID_MARGIN,
      }
    : null;

  const anchors = new Map<string, Point>();
  const pvFrame = b.frames.find((frame) => frame.id === 'frame-pv');
  if (pvFrame) anchors.set('G1', { x: pvFrame.x, y: pvFrame.y });
  // La boîte de jonction est repérée par son cadre, comme le champ.
  for (const frame of b.frames) if (frame.id.startsWith('frame-combiner-O')) anchors.set(`J${frame.id.slice('frame-combiner-O'.length)}`, { x: frame.x, y: frame.y });
  const bom = withGridReferences(b.bom, b.symbols, anchors, grid);

  /* La planche d'exécution vise 6 pt, le minimum d'un plan imprimé. Le synoptique du rapport, qui
     tient sur une page A4 à côté de son texte, accepte 5,5 pt : ses libellés sont des repères courts. */
  const legible = options.detail === 'synoptic' ? 5.5 : LEGIBLE_PT;
  const smallest = smallestLegibleSheet(width, height, legible);
  const requested = normalizeFormat(options.format);
  const format = requested ?? smallest ?? LARGEST_SHEET;
  const smallestTextPt = textPtAt(format, width, height);
  const issues = [...topology.issues];
  if (smallestTextPt < legible) {
    const remedy = smallest ? ` La planche ${FORMAT_LABEL[smallest]} suffirait.` : ' Condenser le champ en représentation synoptique.';
    issues.push({
      level: 'warning',
      message: `À l’échelle ${FORMAT_LABEL[format]}, le plus petit texte tombe à ${smallestTextPt.toFixed(1)} pt. En dessous de ${legible} pt le plan n’est plus lisible imprimé.${remedy}`,
    });
  }

  return {
    width,
    height,
    format,
    symbols: b.symbols,
    wires: b.wires,
    frames: b.frames,
    captions: b.captions,
    junctions: b.junctions,
    legend: options.showLegend ? legend : [],
    footer,
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

const LARGEST_SHEET: SheetFormat = SHEETS[SHEETS.length - 1]!.format;

/** La planche est toujours paysage : un format portrait demandé est pris dans la même taille. */
function normalizeFormat(format: DiagramPlan['format'] | 'auto'): SheetFormat | null {
  if (format === 'auto') return null;
  return format.replace('portrait', 'landscape') as SheetFormat;
}

function textPtAt(format: SheetFormat, width: number, height: number): number {
  const fit = Math.min(USABLE_MM(format) / width, USABLE_HEIGHT_MM(format) / height);
  return (SMALLEST_TEXT_PX * fit * 72) / 25.4;
}

function smallestLegibleSheet(width: number, height: number, legible: number): SheetFormat | null {
  for (const sheet of SHEETS) if (textPtAt(sheet.format, width, height) >= legible) return sheet.format;
  return null;
}

/** Complète la nomenclature avec la case du cadre où trouver chaque appareil. */
function withGridReferences(rows: readonly BillOfMaterialRow[], symbols: readonly PlacedSymbol[], extra: ReadonlyMap<string, Point>, grid: GridFrame | null): BillOfMaterialRow[] {
  if (!grid) return rows.map((row) => ({ ...row }));
  const byReference = new Map<string, Point>(extra);
  for (const symbol of symbols) {
    if (symbol.reference && !byReference.has(symbol.reference)) byReference.set(symbol.reference, { x: symbol.x + symbol.width / 2, y: symbol.y + symbol.height / 2 });
  }
  if (!byReference.has('PE')) {
    const bar = symbols.find((symbol) => symbol.kind === 'earth-bar');
    if (bar) byReference.set('PE', { x: bar.x + bar.width / 2, y: bar.y });
  }
  return rows.map((row) => {
    const at = byReference.get(row.reference);
    if (!at) return { ...row };
    const column = grid.columns[Math.min(grid.columns.length - 1, Math.max(0, Math.floor((at.x - grid.margin) / grid.cellWidth)))] ?? '';
    const line = grid.rows[Math.min(grid.rows.length - 1, Math.max(0, Math.floor((at.y - grid.margin) / grid.cellHeight)))] ?? '';
    return { ...row, gridRef: `${column}${line}` };
  });
}

function buildLegend(topology: SingleLineTopology, labels: DiagramLabels): LegendRow[] {
  const unit = topology.inverters[0];
  const rows: LegendRow[] = [{ kind: 'pv-module', label: labels.pvField }];
  if (topology.options.detail !== 'synoptic' && topology.inverters.some((item) => item.stringFuse)) rows.push({ kind: 'dc-fuse', label: labels.stringFuse });
  const kinds = new Set<SymbolKind>();
  const add = (spec: ProtectionSpec | null | undefined, current: 'dc' | 'ac', label: string) => {
    if (!spec) return;
    const kind = protectionSymbol(spec, current);
    if (kinds.has(kind)) return;
    kinds.add(kind);
    rows.push({ kind, label });
  };
  add(unit?.dcSwitch, 'dc', unit?.dcSwitch?.nature === 'fuse-switch' ? labels.fuseSwitch : unit?.dcSwitch?.kind ?? labels.dcSwitch);
  add(topology.battery?.breaker, 'dc', topology.battery?.breaker?.nature === 'fuse-switch' ? labels.fuseSwitch : labels.dcBreaker);
  add(topology.ac.breaker, 'ac', labels.acBreaker);
  if (topology.inverters.some((item) => item.dcSpd) || topology.ac.spd) rows.push({ kind: 'dc-spd', label: labels.spdType2 });
  if (topology.inverters.some((item) => item.chargeController)) rows.push({ kind: 'charge-controller', label: labels.chargeController });
  rows.push({ kind: 'inverter', label: labels.inverter });
  if (topology.battery) rows.push({ kind: 'battery', label: labels.batteryBank });
  if (topology.ac.rcd) rows.push({ kind: 'rcd', label: labels.rcd });
  if (topology.ac.meter) rows.push({ kind: 'meter', label: labels.meter });
  if (topology.ac.transferSwitch) rows.push({ kind: 'transfer-switch', label: labels.transferSwitch });
  if (topology.ac.grid) rows.push({ kind: 'grid', label: labels.grid });
  if (topology.ac.generator) rows.push({ kind: 'generator', label: labels.generator });
  rows.push({ kind: LOAD_LEGEND[topology.ac.loadKind], label: topology.ac.loadLabel });
  rows.push({ kind: 'earth-electrode', label: labels.earthElectrode });
  rows.push({ kind: 'dc', label: labels.conductorDc });
  rows.push({ kind: 'ac', label: labels.conductorAc });
  rows.push({ kind: 'earth', label: labels.conductorEarth });
  return rows;
}

const LOAD_LEGEND = { building: 'load', pump: 'pump', 'street-light': 'street-light' } as const;

export { amps };
