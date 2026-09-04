import type { AcLineSpec, PlacedSymbol, Point, SymbolKind } from '../contracts.js';
import { SYMBOL_SIZE, anchorOf } from '../symbols.js';
import { Builder, amps, cableNote, hv, vh } from './builder.js';
import { BAND_GAP } from './constants.js';
import type { Bands, Lanes } from './types.js';

/**
 * Bande « distribution alternative ».
 *
 * Descente unique depuis les onduleurs : coupure, parafoudre en dérivation,
 * différentiel, inverseur de source quand une seconde alimentation existe,
 * jeu de barres, puis départ vers les circuits terminaux.
 */

const LOAD_SYMBOL: Readonly<Record<AcLineSpec['loadKind'], SymbolKind>> = {
  building: 'load',
  pump: 'pump',
  'street-light': 'street-light',
};

export function layoutAcLine(
  build: Builder,
  ac: AcLineSpec,
  inverters: readonly PlacedSymbol[],
  bands: Bands,
  lanes: Lanes,
): { earthTaps: Point[] } {
  const labels = build.labels;
  const acX = lanes.mainX + lanes.mainWidth / 2;
  const earthTaps: Point[] = [];
  const first = inverters[0];

  let cursor: Point = first
    ? anchorOf(first, 'ac-out')
    : { x: acX, y: bands.yInverter + SYMBOL_SIZE.inverter.height };

  // Couplage des onduleurs sur un même départ.
  if (inverters.length > 1) {
    const couplingY = bands.yInverter + SYMBOL_SIZE.inverter.height + 22;
    for (const unit of inverters) {
      build.wire('ac', vh(anchorOf(unit, 'ac-out'), { x: anchorOf(unit, 'ac-out').x, y: couplingY }));
    }
    build.wire('ac', [
      { x: anchorOf(inverters[0]!, 'ac-out').x, y: couplingY },
      { x: anchorOf(inverters[inverters.length - 1]!, 'ac-out').x, y: couplingY },
    ]);
    cursor = { x: acX, y: couplingY };
  }

  if (ac.breaker) {
    const w = SYMBOL_SIZE['ac-breaker'].width;
    const symbol = build.place('ac-breaker', acX - w / 2, bands.yAcBreaker, {
      reference: ac.breaker.reference,
      caption: `${ac.breaker.kind} · ${amps(ac.breaker.ratingA, labels)}`,
    });
    build.wire('ac', vh(cursor, anchorOf(symbol, 'top')));
    build.item(ac.breaker.reference, ac.breaker.kind, amps(ac.breaker.ratingA, labels), ac.breaker.quantity);
    cursor = anchorOf(symbol, 'bottom');
  }

  if (ac.spd) {
    const w = SYMBOL_SIZE['ac-spd'].width;
    const symbol = build.place('ac-spd', acX + 54 - w / 2, bands.yAcSpd, {
      reference: ac.spd.reference,
      caption: labels.spdType2,
    });
    build.wire('ac', vh(cursor, { x: cursor.x, y: bands.yRcd }));
    build.wire('ac', [
      { x: cursor.x, y: bands.yAcSpd + 6 },
      { x: anchorOf(symbol, 'top').x, y: bands.yAcSpd + 6 },
      anchorOf(symbol, 'top'),
    ]);
    earthTaps.push(anchorOf(symbol, 'bottom'));
    build.item(ac.spd.reference, ac.spd.kind, ac.spd.voltageV === null ? '—' : `${ac.spd.voltageV} V`, 1);
    cursor = { x: cursor.x, y: bands.yRcd };
  }

  if (ac.rcd) {
    const w = SYMBOL_SIZE.rcd.width;
    build.place('rcd', acX - w / 2 - 6, bands.yRcd, {
      reference: ac.rcd.reference,
      caption: `${ac.rcd.kind}${ac.rcd.ratingA === null ? '' : ` · ${amps(ac.rcd.ratingA, labels)}`}`,
    });
    if (!ac.spd) build.wire('ac', vh(cursor, { x: acX, y: bands.yRcd }));
    build.item(ac.rcd.reference, ac.rcd.kind, amps(ac.rcd.ratingA, labels), ac.rcd.quantity);
    cursor = { x: acX, y: bands.yRcd + SYMBOL_SIZE.rcd.height };
  }

  if (ac.transferSwitch) {
    cursor = layoutSecondSource(build, ac, cursor, acX, bands, lanes);
  }

  const busW = Math.max(SYMBOL_SIZE.busbar.width, lanes.mainWidth * 0.8);
  const busbar = build.place('busbar', acX - busW / 2, bands.yBusbar, { width: busW });
  build.wire('ac', vh(cursor, { x: acX, y: bands.yBusbar + SYMBOL_SIZE.busbar.height / 2 }));
  build.caption(acX - busW / 2 - 8, bands.yBusbar + 7, `${labels.busbar} ${ac.voltageV ?? 230} V`, {
    anchor: 'end',
    size: 8.5,
    tone: 'muted',
  });

  const loadKind = LOAD_SYMBOL[ac.loadKind];
  const loadSize = SYMBOL_SIZE[loadKind];
  const load = build.place(loadKind, acX - loadSize.width / 2, bands.yLoad);
  build.wire('ac', [anchorOf(busbar, 'bottom'), anchorOf(load, 'top')], { annotation: cableNote(ac.cable) });
  build.caption(acX, bands.yLoad + loadSize.height + 16, ac.loadLabel, { size: 9.5, weight: 700 });

  return { earthTaps };
}

/**
 * Seconde alimentation — réseau ou groupe — raccordée par inverseur de source.
 * Elle occupe la colonne de gauche, libre sous le parc batteries.
 */
function layoutSecondSource(
  build: Builder,
  ac: AcLineSpec,
  cursor: Point,
  acX: number,
  bands: Bands,
  lanes: Lanes,
): Point {
  const labels = build.labels;
  const spec = ac.transferSwitch;
  if (!spec) return cursor;

  const w = SYMBOL_SIZE['transfer-switch'].width;
  const swx = build.place('transfer-switch', acX - w / 2, bands.yTransfer, {
    reference: spec.reference,
    caption: spec.kind,
  });
  const fromInverter: Point = { x: swx.x + w * 0.74, y: bands.yTransfer };
  const fromSource: Point = { x: swx.x + w * 0.26, y: bands.yTransfer };
  build.wire('ac', vh(cursor, { x: cursor.x, y: bands.yTransfer - 24 }));
  build.wire('ac', [
    { x: cursor.x, y: bands.yTransfer - 24 },
    { x: fromInverter.x, y: bands.yTransfer - 24 },
    fromInverter,
  ]);
  build.item(spec.reference, spec.kind, `${ac.voltageV ?? 230} V`, 1);

  const sourceKind: SymbolKind = ac.grid ? 'grid' : 'generator';
  const sourceSize = SYMBOL_SIZE[sourceKind];
  const sourceY = bands.yTransfer + 8;
  const source = build.place(sourceKind, lanes.sourceX, sourceY);
  const sourceLabel = ac.grid?.label ?? ac.generator?.label ?? '';
  build.caption(lanes.sourceX + sourceSize.width / 2, sourceY + sourceSize.height + 15, sourceLabel, {
    size: 9,
    weight: 700,
  });
  build.item(ac.grid ? 'W1' : 'GE1', sourceLabel, `${ac.voltageV ?? 230} V`, 1);

  let sourceOut: Point = anchorOf(source, 'top');

  if (ac.meter) {
    const mw = SYMBOL_SIZE.meter.width;
    const meterY = bands.yTransfer - BAND_GAP - SYMBOL_SIZE.meter.height + 10;
    const meter = build.place('meter', lanes.sourceX + sourceSize.width / 2 - mw / 2, meterY, {
      reference: 'M1',
      caption: labels.meter,
    });
    build.wire('ac', [sourceOut, anchorOf(meter, 'bottom')]);
    build.item('M1', labels.meter, `${ac.voltageV ?? 230} V`, 1);
    sourceOut = anchorOf(meter, 'top');
  }

  const junctionY = bands.yTransfer - 42;
  build.wire('ac', [
    sourceOut,
    { x: sourceOut.x, y: junctionY },
    { x: fromSource.x, y: junctionY },
    fromSource,
  ]);

  return anchorOf(swx, 'bottom');
}

export { hv };
