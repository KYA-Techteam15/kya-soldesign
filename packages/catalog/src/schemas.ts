import { z } from 'zod';

const provenanceSchema = z.object({
  sourceId: z.string().min(1),
  importedAt: z.iso.datetime(),
  sourceRecordId: z.string().min(1),
}).strict();

const baseEquipmentSchema = z.object({
  id: z.string().min(1),
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  provenance: provenanceSchema,
}).strict();

export const pvModuleSchema = baseEquipmentSchema.extend({
  kind: z.literal('pv-module'),
  nominalPowerW: z.number().positive(),
  openCircuitVoltageV: z.number().positive(),
  shortCircuitCurrentA: z.number().positive(),
}).strict();

export const batterySchema = baseEquipmentSchema.extend({
  kind: z.literal('battery'),
  nominalVoltageV: z.number().positive(),
  nominalCapacityWh: z.number().positive(),
  usableDepthOfDischarge: z.number().min(0).max(1),
  cycleLife: z.number().int().positive().nullable(),
}).strict();

export const inverterSchema = baseEquipmentSchema.extend({
  kind: z.literal('inverter'),
  nominalAcPowerW: z.number().positive(),
  surgePowerW: z.number().positive(),
  dcVoltageV: z.number().positive(),
}).strict();

export const equipmentSchema = z.discriminatedUnion('kind', [
  pvModuleSchema,
  batterySchema,
  inverterSchema,
]);

export type Equipment = z.infer<typeof equipmentSchema>;

