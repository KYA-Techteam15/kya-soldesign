import { normalizeMeterEstimateToAioDailyLoad, normalizedHourlyProfileSchema, type NormalizedHourlyProfile } from '@ksd/domain';
import type { LoadInputIssue, Page1LoadNormalization } from './contracts.js';

export type MeterGammaAdjustment =
  | { readonly status: 'ready'; readonly hourlyEnergyFractions: readonly number[]; readonly naturalGamma: number; readonly achievedGamma: number; readonly movedFraction: number }
  | { readonly status: 'blocked'; readonly code: 'YEN_WEATHER_MISSING' | 'YEN_TARGET_UNREACHABLE'; readonly message: string };

/** Adjust a sourced facture profile while preserving its relative shape in both solar groups. */
export function adjustHourlyFractionsToGamma(input: {
  readonly hourlyEnergyFractions: readonly number[];
  readonly meanHourlyPoaWm2: readonly number[];
  readonly thresholdWm2: number;
  readonly targetGamma: number;
}): MeterGammaAdjustment {
  if (input.meanHourlyPoaWm2.length !== 24) return { status: 'blocked', code: 'YEN_WEATHER_MISSING', message: 'A 24-hour weather resource is required to force YEn' };
  if (input.hourlyEnergyFractions.length !== 24 || input.targetGamma < 0 || input.targetGamma > 1) return { status: 'blocked', code: 'YEN_TARGET_UNREACHABLE', message: 'The YEn target must be between 0 and 1' };
  const solar = input.hourlyEnergyFractions.reduce((sum, value, hour) => sum + (input.meanHourlyPoaWm2[hour]! >= input.thresholdWm2 ? value : 0), 0);
  const nonSolar = 1 - solar;
  const target = input.targetGamma;
  const tolerance = 1e-12;
  if ((target > tolerance && solar <= tolerance) || (target < 1 - tolerance && nonSolar <= tolerance)) return { status: 'blocked', code: 'YEN_TARGET_UNREACHABLE', message: 'The selected profile has no energy in one group needed by this target' };
  const fractions = input.hourlyEnergyFractions.map((value, hour) => input.meanHourlyPoaWm2[hour]! >= input.thresholdWm2
    ? value * (solar <= tolerance ? 0 : target / solar)
    : value * (nonSolar <= tolerance ? 0 : (1 - target) / nonSolar));
  const achievedGamma = fractions.reduce((sum, value, hour) => sum + (input.meanHourlyPoaWm2[hour]! >= input.thresholdWm2 ? value : 0), 0);
  const movedFraction = fractions.reduce((sum, value, hour) => sum + Math.abs(value - input.hourlyEnergyFractions[hour]!), 0) / 2;
  return { status: 'ready', hourlyEnergyFractions: fractions, naturalGamma: solar, achievedGamma, movedFraction };
}

export function normalizeMeterReading(input: {
  readonly timezoneIana: string;
  readonly observedEnergyWh: number | null;
  readonly observedDays: number | null;
  readonly profile: NormalizedHourlyProfile | null;
  readonly hourlyEnergyFractions?: readonly number[];
}): Page1LoadNormalization {
  const issues: LoadInputIssue[] = [];
  if (input.observedEnergyWh === null || !Number.isFinite(input.observedEnergyWh) || input.observedEnergyWh < 0) issues.push(issue('LOAD_METER_ENERGY_MISSING', 'observedEnergyWh', 'Observed energy must be explicitly declared'));
  if (input.observedDays === null || !Number.isInteger(input.observedDays) || input.observedDays <= 0) issues.push(issue('LOAD_METER_DAYS_MISSING', 'observedDays', 'The exact positive number of observed days is required'));
  const parsedProfile = normalizedHourlyProfileSchema.safeParse(input.profile);
  if (!parsedProfile.success) issues.push(issue('LOAD_METER_PROFILE_MISSING', 'profile', 'A sourced normalized load profile is required'));
  if (issues.length > 0) return { status: 'blocked', issues };
  return {
    status: 'ready',
    load: normalizeMeterEstimateToAioDailyLoad({
      timezoneIana: input.timezoneIana,
      observedEnergyWh: input.observedEnergyWh!,
      observedDays: input.observedDays!,
      profile: { ...parsedProfile.data!, ...(input.hourlyEnergyFractions === undefined ? {} : { hourlyEnergyFractions: [...input.hourlyEnergyFractions] }) },
      startupEvents: [{
        hourIndex: parsedProfile.data!.hourlyEnergyFractions.indexOf(Math.max(...parsedProfile.data!.hourlyEnergyFractions)),
        runningPowerW: 1,
        startupPowerMultiplier: null,
        isInductive: true,
        sourceRef: 'meter-transient-unmodeled',
      }],
    }),
    warnings: [{ code: 'LOAD_METER_ESTIMATE', message: 'Hourly values are estimated from a sourced normalized profile; transient peak is unknown' }],
  };
}

function issue(code: string, path: string, message: string): LoadInputIssue {
  return { code, path, message };
}
