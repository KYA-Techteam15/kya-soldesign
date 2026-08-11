import { z } from 'zod';

export const systemKindSchema = z.enum([
  'standalone-all-in-one',
  'standalone-controller-inverter',
  'grid-tied',
  'pv-diesel',
  'solar-pumping',
  'solar-street-lighting',
]);

export type SystemKind = z.infer<typeof systemKindSchema>;

export const issueSeveritySchema = z.enum(['info', 'warning', 'error']);

export const dataIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(['warning', 'error']),
  message: z.string().min(1),
  path: z.string().min(1).optional(),
}).strict();

export type DataIssue = z.infer<typeof dataIssueSchema>;

export const calculationIssueSchema = z.object({
  code: z.string().min(1),
  severity: issueSeveritySchema,
  message: z.string().min(1),
  path: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
}).strict();

export type CalculationIssue = z.infer<typeof calculationIssueSchema>;

export interface CalculationTraceEntry {
  readonly id: string;
  readonly formulaId: string;
  readonly sourceId: string;
  readonly inputPaths: readonly string[];
  readonly outputPath: string;
}

export interface CalculationEnvelope<Output> {
  readonly engineVersion: string;
  readonly inputHash: string;
  readonly output: Output;
  readonly issues: readonly CalculationIssue[];
  readonly trace: readonly CalculationTraceEntry[];
}
