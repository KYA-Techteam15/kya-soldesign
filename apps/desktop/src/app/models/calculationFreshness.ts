export type CalculationStage = 'presizing' | 'sizing' | 'protections' | 'cables';

export interface CalculationFingerprint {
  readonly stage: CalculationStage;
  readonly inputHash: string;
  readonly status: 'valid' | 'stale';
  readonly staleReason?: string;
}

const DOWNSTREAM: Readonly<Record<CalculationStage, readonly CalculationStage[]>> = {
  presizing: ['sizing', 'protections', 'cables'],
  sizing: ['protections', 'cables'],
  protections: ['cables'],
  cables: [],
};

export function invalidateDownstream(current: readonly CalculationFingerprint[], changedStage: CalculationStage, reason: string): readonly CalculationFingerprint[] {
  const invalidated = new Set(DOWNSTREAM[changedStage]);
  return current.map((entry) => invalidated.has(entry.stage) ? { ...entry, status: 'stale', staleReason: reason } : entry);
}

export function isCalculationFresh(entry: CalculationFingerprint | undefined, inputHash: string): boolean {
  return entry?.status === 'valid' && entry.inputHash === inputHash;
}
