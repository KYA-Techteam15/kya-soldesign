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

/**
 * Version émise d'un dossier : l'instantané de ce qui a été remis au client (entrées, sélection,
 * calculs) et les empreintes de ces calculs. Les documents se régénèrent depuis l'instantané.
 */
const issuedVersionSchema = z.object({
  number: z.number().int().min(1),
  issuedAt: z.iso.datetime(),
  reference: z.string(),
  snapshot: z.object({
    name: z.string().min(1),
    inputs: z.record(z.string(), z.unknown()),
    selectedEquipmentIds: z.array(z.string()),
    lastCalculation: calculationEnvelopeSchema.nullable(),
    sizingCalculation: calculationEnvelopeSchema.nullable(),
  }).strict(),
  fingerprints: z.object({ presizing: z.string().nullable(), sizing: z.string().nullable() }).strict(),
}).strict();

/** Cycle de vie : versions émises, et verrou tant que la dernière n'est pas révisée. Absent : jamais émis. */
const projectIssueSchema = z.object({
  locked: z.boolean(),
  versions: z.array(issuedVersionSchema),
}).strict();

export type IssuedVersionV1 = z.infer<typeof issuedVersionSchema>;
export type ProjectIssueV1 = z.infer<typeof projectIssueSchema>;

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
  issue: projectIssueSchema.optional(),
}).strict();

export type ProjectFileV1 = z.infer<typeof projectFileV1Schema>;

export function parseProjectFile(value: unknown): ProjectFileV1 {
  return projectFileV1Schema.parse(value);
}
