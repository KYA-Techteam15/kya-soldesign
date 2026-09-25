import { describe, expect, it } from 'vitest';
import { paginate, type MeasuredBlock } from '../../src/app/export/pagination.js';

const block = (height: number, keepWithNext = false): MeasuredBlock => ({ height, keepWithNext });
const table = (head: number, rows: readonly number[], margin = 0): MeasuredBlock => ({ height: head + rows.reduce((a, b) => a + b, 0) + margin, keepWithNext: false, table: { head, rows } });

describe('report pagination (spec 012, FR-C1)', () => {
  it('fills a sheet before opening the next one', () => {
    expect(paginate([block(300), block(300), block(300)], 700)).toEqual([[{ block: 0 }, { block: 1 }], [{ block: 2 }]]);
  });

  it('never leaves a heading alone at the bottom of a sheet', () => {
    const pages = paginate([block(600), block(40, true), block(200)], 700);
    expect(pages).toEqual([[{ block: 0 }], [{ block: 1 }, { block: 2 }]]);
  });

  it('continues a long table on the next sheet, between two rows', () => {
    const rows = Array.from({ length: 30 }, () => 30);
    const pages = paginate([block(200), table(40, rows)], 700);
    expect(pages[0]).toEqual([{ block: 0 }, { block: 1, rows: [0, 15] }]);
    expect(pages[1]).toEqual([{ block: 1, rows: [15, 30] }]);
  });

  it('never carries a single row over to the next sheet', () => {
    const pages = paginate([block(400), table(40, [30, 30, 30, 30, 30, 30, 30, 30, 30])], 700);
    expect(pages[0]).toEqual([{ block: 0 }, { block: 1, rows: [0, 7] }]);
    expect(pages[1]).toEqual([{ block: 1, rows: [7, 9] }]);
  });

  it('moves a table to the next sheet when fewer than two rows would fit', () => {
    const pages = paginate([block(640), table(40, [30, 30, 30])], 700);
    expect(pages).toEqual([[{ block: 0 }], [{ block: 1 }]]);
  });

  it('keeps every row exactly once, in order', () => {
    const rows = Array.from({ length: 95 }, (_, index) => 20 + (index % 3) * 7);
    const pages = paginate([block(120, true), table(36, rows, 12), block(80)], 650);
    const covered = pages.flat().filter((piece) => piece.block === 1).flatMap((piece) => {
      const [start, end] = piece.rows ?? [0, rows.length];
      return Array.from({ length: end - start }, (_, offset) => start + offset);
    });
    expect(covered).toEqual(rows.map((_, index) => index));
    expect(pages.every((page) => page.length > 0)).toBe(true);
  });

  it('shrinks the diagram to stay under its heading rather than leave the heading alone', () => {
    const pages = paginate([block(40, true), { height: 700, keepWithNext: false, minHeight: 420 }], 680);
    expect(pages).toEqual([[{ block: 0 }, { block: 1 }]]);
  });

  it('gives an oversized block a sheet of its own', () => {
    expect(paginate([block(100), block(900), block(100)], 700)).toEqual([[{ block: 0 }], [{ block: 1 }], [{ block: 2 }]]);
  });
});
