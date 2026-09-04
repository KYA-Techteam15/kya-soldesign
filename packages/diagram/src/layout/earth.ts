import type { EarthNetworkSpec, PlacedSymbol, Point } from '../contracts.js';
import { SYMBOL_SIZE, anchorOf } from '../symbols.js';
import { Builder, hv } from './builder.js';
import type { Bands, Lanes } from './types.js';

/**
 * Bande « terre ».
 *
 * Le collecteur longe la planche et recueille les masses ; la barrette de
 * coupure le sépare de la prise de terre. Sans cette barrette, la résistance
 * de la prise n'est plus mesurable une fois l'installation en service — c'est
 * un organe d'exploitation, pas une décoration.
 */
export function layoutEarth(
  build: Builder,
  earth: EarthNetworkSpec,
  taps: readonly Point[],
  inverters: readonly PlacedSymbol[],
  bands: Bands,
  lanes: Lanes,
): void {
  if (!earth.enabled) return;
  const labels = build.labels;
  const x = lanes.earthX;

  const barTop = Math.min(bands.ySpd - 16, bands.yInverter - 90);
  const barBottom = bands.yBusbar + 10;
  const bar = build.place('earth-bar', x - SYMBOL_SIZE['earth-bar'].width / 2, barTop, {
    height: Math.max(60, barBottom - barTop),
  });
  build.caption(x, barTop - 10, labels.earthBar, { size: 8, weight: 600, tone: 'muted' });

  for (const unit of inverters) {
    const anchor = anchorOf(unit, 'earth');
    build.wire('earth', hv(anchor, { x, y: anchor.y }));
  }
  for (const tap of taps) {
    build.wire('earth', hv(tap, { x, y: tap.y + 10 }));
  }

  if (earth.mainSectionMm2 !== null) {
    build.caption(x - 12, barTop + 26, `${earth.mainSectionMm2} mm²`, {
      anchor: 'end',
      size: 8,
      tone: 'muted',
    });
  }

  let cursor: Point = anchorOf(bar, 'bottom');

  if (earth.cutoffLink) {
    const lw = SYMBOL_SIZE['earth-link'].width;
    const link = build.place('earth-link', x - lw / 2, barBottom + 24, {
      reference: 'X1',
      caption: labels.earthCutoff,
    });
    build.wire('earth', [cursor, anchorOf(link, 'top')]);
    build.item('X1', labels.earthCutoff, '—', 1);
    cursor = anchorOf(link, 'bottom');
  }

  const electrodeW = SYMBOL_SIZE['earth-electrode'].width;
  const electrode = build.place('earth-electrode', x - electrodeW / 2, cursor.y + 26, { reference: 'T1' });
  build.wire('earth', [cursor, anchorOf(electrode, 'top')]);
  if (earth.electrodeSectionMm2 !== null) {
    build.caption(x - 10, cursor.y + 16, `${earth.electrodeSectionMm2} mm²`, {
      anchor: 'end',
      size: 8,
      tone: 'muted',
    });
  }
  build.caption(x, cursor.y + 26 + SYMBOL_SIZE['earth-electrode'].height + 14, labels.earthElectrode, {
    size: 8.5,
    weight: 700,
    tone: 'muted',
  });
  build.item('T1', labels.earthElectrode, earth.electrodeSectionMm2 === null ? '—' : `${earth.electrodeSectionMm2} mm²`, 1);
}
