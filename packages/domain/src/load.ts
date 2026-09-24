import { z } from 'zod';
import { provenanceSchema } from './weather.js';

const fractionSchema = z.number().finite().min(0).max(1);
const normalizedTolerance = 1e-9;

export const hourlyOperatingFractionsSchema = z.array(fractionSchema).length(24);

export const normalizedHourlyProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  hourlyEnergyFractions: z.array(z.number().finite().min(0)).length(24),
  provenance: provenanceSchema,
}).strict().superRefine((value, context) => {
  const sum = value.hourlyEnergyFractions.reduce((total, fraction) => total + fraction, 0);
  if (Math.abs(sum - 1) > normalizedTolerance) {
    context.addIssue({
      code: 'custom',
      message: `hourlyEnergyFractions must sum to 1; received ${sum}`,
      path: ['hourlyEnergyFractions'],
    });
  }
});

export const loadItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  quantity: z.number().int().positive(),
  activePowerW: z.number().finite().min(0),
  powerFactor: z.number().finite().gt(0).max(1).nullable(),
  hourlyOperatingFractions: hourlyOperatingFractionsSchema,
}).strict();

export type NormalizedHourlyProfile = z.infer<typeof normalizedHourlyProfileSchema>;
export type LoadItem = z.infer<typeof loadItemSchema>;

export function deriveDailyLoadEnergyWh(load: LoadItem): number {
  const operatingHours = load.hourlyOperatingFractions.reduce((total, fraction) => total + fraction, 0);
  return load.activePowerW * load.quantity * operatingHours;
}

export function normalizeHourlyEnergyWeights(weights: readonly number[]): readonly number[] {
  if (weights.length !== 24 || weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new RangeError('weights must contain 24 finite non-negative values');
  }
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (sum <= 0) {
    throw new RangeError('weights must have a positive sum');
  }
  return weights.map((weight) => weight / sum);
}
