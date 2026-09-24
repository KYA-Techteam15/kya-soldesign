import type { CalculationTraceEntry } from '@ksd/domain';

/** Empreinte FNV-1a 32 bits, partagée par tous les moteurs pour le hash d'entrée. */
export function fnv1aHash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(16).padStart(8, '0');
}

export function hashInput(input: unknown): string {
  return fnv1aHash(JSON.stringify(input));
}

/** Entrée de trace : relie une sortie à sa formule et à sa source documentée. */
export function trace(outputPath: string, formulaId: string, sourceId: string, inputPaths: readonly string[]): CalculationTraceEntry {
  return { id: `trace:${outputPath}`, formulaId, sourceId, inputPaths, outputPath };
}
