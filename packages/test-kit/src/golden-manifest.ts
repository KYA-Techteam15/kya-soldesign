import { z } from 'zod';

export const goldenManifestSchema = z.object({
  schemaVersion: z.literal(1),
  cases: z.array(z.object({
    id: z.string().min(1),
    specRequirementIds: z.array(z.string().min(1)).min(1),
    sourceIds: z.array(z.string().min(1)).min(1),
    inputFile: z.string().min(1),
    expectedFile: z.string().min(1),
    reviewedBy: z.string().min(1),
    reviewedAt: z.iso.datetime(),
  }).strict()),
}).strict();

