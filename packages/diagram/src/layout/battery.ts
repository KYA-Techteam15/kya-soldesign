import type { BatteryBankSpec, DiagramOptions, PlacedSymbol, Point } from '../contracts.js';
import { SYMBOL_SIZE, anchorOf } from '../symbols.js';
import { Builder, amps, cableNote, collapse, hv, num } from './builder.js';
import { BATTERY_GAP_X, BATTERY_GAP_Y, LABEL_HEADROOM, MARGIN } from './constants.js';
import type { Bands, Lanes } from './types.js';

/**
 * Bande « stockage ».
 *
 * Le parc est une dérivation latérale : matrice série × parallèle, rails de
 * mise en parallèle sur les deux flancs, puis coupure bipolaire juste en amont
 * de l'onduleur. Les deux polarités contournent le bloc par des chemins
 * opposés, sinon elles se superposeraient sur toute la largeur.
 */

/** Largeur occupée par le parc, mesurée avant tout placement. */
export function measureBattery(
  bank: BatteryBankSpec | null,
  options: DiagramOptions,
): { columns: number; width: number } {
  if (!bank) return { columns: 0, width: 0 };
  const run = collapse(bank.unitsInSeries, options.maxDrawnBatteries);
  const columns = run.head + run.tail + (run.hidden > 0 ? 1 : 0);
  const width = columns * SYMBOL_SIZE.battery.width + (columns - 1) * BATTERY_GAP_X + 30;
  return { columns, width };
}

export function layoutBattery(
  build: Builder,
  bank: BatteryBankSpec,
  firstInverter: PlacedSymbol,
  bands: Bands,
  lanes: Lanes,
  options: DiagramOptions,
): void {
  const labels = build.labels;
  const series = collapse(bank.unitsInSeries, options.maxDrawnBatteries);
  const rows = collapse(bank.stringsInParallel, 3);
  const drawnColumns = series.head + series.tail + (series.hidden > 0 ? 1 : 0);
  const drawnRows = rows.head + rows.tail + (rows.hidden > 0 ? 1 : 0);

  const cellW = SYMBOL_SIZE.battery.width;
  const cellH = SYMBOL_SIZE.battery.height;
  const rowPitch = cellH + BATTERY_GAP_Y;
  const blockHeight = drawnRows * rowPitch - BATTERY_GAP_Y;
  const blockY = Math.max(MARGIN + LABEL_HEADROOM, bands.yInverter - blockHeight / 2);
  const blockX = lanes.batteryX;

  const rowPlus: Point[] = [];
  const rowMinus: Point[] = [];
  const unitLabel = [
    bank.unitVoltageV === null ? null : `${bank.unitVoltageV} V`,
    bank.unitCapacityAh === null ? null : `${bank.unitCapacityAh} Ah`,
  ]
    .filter(Boolean)
    .join(' · ');

  for (let rowIndex = 0; rowIndex < drawnRows; rowIndex += 1) {
    const y = blockY + rowIndex * rowPitch;
    if (rows.hidden > 0 && rowIndex === rows.head) {
      build.place('parallel-break', blockX + lanes.batteryWidth / 2 - 20, y + cellH / 2 - 28, {
        data: { hidden: rows.hidden },
      });
      continue;
    }

    let cellX = blockX;
    let previousMinus: Point | null = null;

    for (let column = 0; column < drawnColumns; column += 1) {
      if (series.hidden > 0 && column === series.head) {
        build.place('parallel-break', cellX, y + cellH / 2 - 28, { data: { hidden: series.hidden } });
        cellX += SYMBOL_SIZE['parallel-break'].width + BATTERY_GAP_X;
        continue;
      }
      const isFirst = rowPlus.length === 0 && previousMinus === null;
      const cell = build.place('battery', cellX, y, {
        reference: isFirst ? 'B1' : null,
        data: { label: unitLabel },
      });
      const plus = anchorOf(cell, 'plus');
      const minus = anchorOf(cell, 'minus');
      if (previousMinus) {
        build.wire('dc-positive', [previousMinus, plus], {
          dashed: series.hidden > 0 && column === series.head + 1,
        });
      } else {
        rowPlus.push(plus);
      }
      previousMinus = minus;
      cellX += cellW + BATTERY_GAP_X;
    }
    if (previousMinus) rowMinus.push(previousMinus);
  }

  const railPlusX = blockX - 14;
  const railMinusX = blockX + lanes.batteryWidth + 2;
  connectRail(build, 'dc-positive', railPlusX, rowPlus, 'in');
  connectRail(build, 'dc-negative', railMinusX, rowMinus, 'out');

  build.frame(
    'frame-battery',
    `${labels.batteryBank} · ${bank.unitsInSeries}S × ${bank.stringsInParallel}P`,
    blockX - 30,
    blockY - 24,
    lanes.batteryWidth + 48,
    blockHeight + 42,
  );
  build.caption(
    blockX + lanes.batteryWidth / 2,
    blockY + blockHeight + 30,
    [
      bank.bankVoltageV === null ? null : `${Math.round(bank.bankVoltageV)} V`,
      bank.usefulEnergyKwh === null ? null : `${num(bank.usefulEnergyKwh, 1, labels)} ${labels.usefulEnergy}`,
      `${bank.totalUnits} ${labels.units}`,
    ]
      .filter(Boolean)
      .join(' · '),
    { size: 8.5, tone: 'muted' },
  );
  build.item(
    'B1',
    bank.product ?? labels.batteryBank,
    [unitLabel, `${bank.unitsInSeries}S × ${bank.stringsInParallel}P`].filter(Boolean).join(' · '),
    bank.totalUnits,
  );

  let plusPoint: Point = { x: railPlusX, y: rowPlus[0]?.y ?? blockY };
  let minusPoint: Point = { x: railMinusX, y: rowMinus[0]?.y ?? blockY };
  const note = cableNote(bank.cable);

  if (bank.breaker) {
    const bw = SYMBOL_SIZE['dc-breaker'].width;
    const laneX = firstInverter.x - 2 * bw - 54;
    const breakerY = bands.yInverter + 2;
    const returnY = blockY + blockHeight + 52;
    const outboundY = Math.min(blockY - 22, bands.ySwitch - 26);

    const bp = build.place('dc-breaker', laneX, breakerY, { reference: bank.breaker.reference });
    const bm = build.place('dc-breaker', laneX + bw + 20, breakerY);
    build.wire('dc-positive', [
      plusPoint,
      { x: railPlusX, y: returnY },
      { x: anchorOf(bp, 'bottom').x, y: returnY },
      anchorOf(bp, 'bottom'),
    ]);
    build.wire('dc-negative', [
      minusPoint,
      { x: railMinusX, y: outboundY },
      { x: anchorOf(bm, 'top').x, y: outboundY },
      anchorOf(bm, 'top'),
    ]);
    build.caption(
      laneX + bw + 10,
      returnY + 16,
      [`${bank.breaker.kind} · ${amps(bank.breaker.ratingA, labels)}`, note].filter(Boolean).join(' · '),
      { size: 8.5, tone: 'muted' },
    );
    build.item(bank.breaker.reference, bank.breaker.kind, amps(bank.breaker.ratingA, labels), bank.breaker.quantity);
    plusPoint = anchorOf(bp, 'top');
    minusPoint = anchorOf(bm, 'bottom');
  }

  build.wire('dc-positive', hv(plusPoint, anchorOf(firstInverter, 'battery-plus')));
  build.wire('dc-negative', hv(minusPoint, anchorOf(firstInverter, 'battery-minus')));
}

/** Relie les branches sur un rail vertical commun. */
function connectRail(
  build: Builder,
  conductor: 'dc-positive' | 'dc-negative',
  railX: number,
  points: readonly Point[],
  direction: 'in' | 'out',
): void {
  if (points.length === 0) return;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  build.wire(conductor, [
    { x: railX, y: first.y },
    { x: railX, y: last.y },
  ]);
  for (const point of points) {
    build.wire(conductor, direction === 'in' ? [{ x: railX, y: point.y }, point] : [point, { x: railX, y: point.y }]);
  }
}
