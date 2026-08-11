import { systemKindSchema } from '@ksd/domain';
import { z } from 'zod';

export const projectFileV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  name: z.string().min(1),
  system: systemKindSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  inputs: z.record(z.string(), z.unknown()),
  selectedEquipmentIds: z.array(z.string()),
  lastCalculation: z.null(),
}).strict();

export type ProjectFileV1 = z.infer<typeof projectFileV1Schema>;

export function parseProjectFile(value: unknown): ProjectFileV1 {
  return projectFileV1Schema.parse(value);
}

