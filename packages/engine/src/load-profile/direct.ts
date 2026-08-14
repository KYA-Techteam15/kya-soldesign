import { normalizeDirectHourlyPowerToAioDailyLoad, type StartupEventV1 } from '@ksd/domain';
import type { LoadInputIssue, Page1LoadNormalization } from './contracts.js';

export function normalizeDirectHourlyRows(input: {
  readonly timezoneIana: string;
  readonly hourlyPowerW: readonly number[];
  readonly hourlyPeakPowerW: readonly (number | null)[];
}): Page1LoadNormalization {
  const issues: LoadInputIssue[] = [];
  if (input.hourlyPowerW.length !== 24) issues.push(issue('LOAD_DIRECT_LENGTH_INVALID', 'hourlyPowerW', 'Exactly 24 hourly powers are required'));
  if (input.hourlyPeakPowerW.length !== 24) issues.push(issue('LOAD_DIRECT_PEAK_LENGTH_INVALID', 'hourlyPeakPowerW', 'Exactly 24 hourly peaks are required'));
  input.hourlyPowerW.forEach((value, hour) => {
    if (!Number.isFinite(value) || value < 0) issues.push(issue('LOAD_DIRECT_POWER_INVALID', `hourlyPowerW.${hour}`, 'Hourly power must be finite and non-negative'));
    const peak = input.hourlyPeakPowerW[hour];
    if (peak !== null && peak !== undefined && (!Number.isFinite(peak) || peak < value)) issues.push(issue('LOAD_DIRECT_PEAK_INVALID', `hourlyPeakPowerW.${hour}`, 'Hourly peak must be greater than or equal to average power'));
  });
  if (issues.length > 0) return { status: 'blocked', issues };

  const hasUnmodeledPeak = input.hourlyPeakPowerW.some((peak, hour) => peak !== null && peak > input.hourlyPowerW[hour]!);
  const startupEvents: StartupEventV1[] = hasUnmodeledPeak ? [{
    hourIndex: input.hourlyPeakPowerW.findIndex((peak, hour) => peak !== null && peak > input.hourlyPowerW[hour]!),
    runningPowerW: 1,
    startupPowerMultiplier: null,
    isInductive: true,
    sourceRef: 'direct-hourly-peak-unmodeled',
  }] : [];
  try {
    return {
      status: 'ready',
      load: normalizeDirectHourlyPowerToAioDailyLoad({ timezoneIana: input.timezoneIana, hourlyPowerW: input.hourlyPowerW, startupEvents }),
      warnings: hasUnmodeledPeak ? [{ code: 'LOAD_DIRECT_TRANSIENT_UNMODELED', message: 'Direct transient peaks are recorded but AIO v1 cannot consume their magnitude; surge output is blocked' }] : [],
    };
  } catch (error) {
    return { status: 'blocked', issues: [issue('LOAD_DIRECT_INVALID', 'hourlyPowerW', error instanceof Error ? error.message : 'Invalid direct profile')] };
  }
}

function issue(code: string, path: string, message: string): LoadInputIssue {
  return { code, path, message };
}
