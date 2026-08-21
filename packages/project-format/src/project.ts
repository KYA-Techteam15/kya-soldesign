import { systemKindSchema } from '@ksd/domain';
import { z } from 'zod';

const calculationIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['warning', 'error', 'info']),
  message: z.string(),
  sourceId: z.string().optional(),
}).strict();

const calculationEnvelopeSchema = z.object({
  engineVersion: z.string(),
  inputHash: z.string(),
  output: z.unknown(),
  issues: z.array(calculationIssueSchema).readonly(),
  warnings: z.array(z.unknown()).readonly().optional(),
  trace: z.array(z.unknown()).readonly(),
}).strict();

export const projectFileV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  name: z.string().min(1),
  system: systemKindSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  inputs: z.record(z.string(), z.unknown()),
  selectedEquipmentIds: z.array(z.string()),
  lastCalculation: calculationEnvelopeSchema.nullable(),
  sizingCalculation: calculationEnvelopeSchema.nullable().optional(),
}).strict();

export type ProjectFileV1 = z.infer<typeof projectFileV1Schema>;

export function parseProjectFile(value: unknown): ProjectFileV1 {
  return projectFileV1Schema.parse(value);
}
