import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { aioSizingRequestV1Schema } from '@ksd/domain';
import { describe, expect, it } from 'vitest';
import { AioSizingEngine, type AioOutputId, type AioUnit } from '../../src/index.js';

interface GoldenExpected {
  readonly schemaVersion: 1;
  readonly caseId: string;
  readonly engineVersion: string;
  readonly inputHash: string;
  readonly reviewedBy: string;
  readonly reviewedAt: string;
  readonly reviewRecordCanonical: string;
  readonly manualCalculations: readonly {
    readonly outputId: AioOutputId;
    readonly formulaId: string;
    readonly expression: string;
    readonly expectedValue: number;
    readonly unit: AioUnit;
  }[];
  readonly expectedTraceSources: readonly {
    readonly outputId: AioOutputId;
    readonly formulaId: string;
    readonly sourceIds: readonly string[];
  }[];
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(`../../../../test-data/golden/${path}`, import.meta.url), 'utf8'));
}

describe('AIO reviewed golden', () => {
  it('matches the approved independent manual calculations and evidence', async () => {
    const input = aioSizingRequestV1Schema.parse(await readJson('aio-001-input.json'));
    const expected = await readJson('aio-001-expected.json') as GoldenExpected;
    const envelope = new AioSizingEngine(expected.engineVersion).calculateSync({ system: 'standalone-all-in-one', input });

    expect(expected.schemaVersion).toBe(1);
    expect(expected.caseId).toBe('AIO-G-001');
    expect(expected.reviewedBy).toBeTruthy();
    expect(Number.isNaN(Date.parse(expected.reviewedAt))).toBe(false);
    expect(input.provenance[0]!.sourceSha256).toBe(createHash('sha256').update(expected.reviewRecordCanonical).digest('hex'));
    expect(envelope.inputHash).toBe(expected.inputHash);
    expect(envelope.violatedConstraints).toEqual([]);
    expect(envelope.warnings).toEqual([]);

    for (const manual of expected.manualCalculations) {
      const output = envelope.output[manual.outputId];
      expect(output, manual.expression).toMatchObject({ status: 'available', value: manual.expectedValue, unit: manual.unit });
    }
    for (const evidence of expected.expectedTraceSources) {
      expect(envelope.trace.find((trace) => trace.outputPath === `output.${evidence.outputId}`)).toMatchObject({
        formulaId: evidence.formulaId,
        sourceIds: evidence.sourceIds,
      });
    }
    expect(new Set(expected.manualCalculations.map((item) => item.formulaId))).toEqual(new Set([
      'CALC-AIO-001', 'CALC-AIO-002', 'CALC-AIO-003', 'CALC-AIO-004', 'CALC-AIO-005', 'CALC-AIO-006', 'CALC-AIO-007',
    ]));
  });
});
