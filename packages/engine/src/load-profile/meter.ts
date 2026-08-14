import { normalizeMeterEstimateToAioDailyLoad, normalizedHourlyProfileSchema, type NormalizedHourlyProfile } from '@ksd/domain';
import type { LoadInputIssue, Page1LoadNormalization } from './contracts.js';

export function normalizeMeterReading(input: {
  readonly timezoneIana: string;
  readonly observedEnergyWh: number | null;
  readonly observedDays: number | null;
  readonly profile: NormalizedHourlyProfile | null;
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
      profile: parsedProfile.data!,
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
