/** The annual mode remains supported for migration; composed profiles use the explicit modes. */
export type AnnualCalendarMode = 'annual' | 'workweek-weekend' | 'periods' | 'periods-by-day-type';

export interface AnnualDayGroup {
  readonly id: string;
  readonly kind: 'all-days' | 'workweek' | 'weekend';
  readonly weekdaysIso: readonly number[];
}

export interface AnnualPeriod {
  readonly id: string;
  readonly name: string;
  /** Inclusive MM-DD bounds. A range may cross 31 December. */
  readonly startMonthDay: string;
  readonly endMonthDay: string;
  readonly displayColor?: string;
}

export interface AnnualProfileAssignment {
  readonly periodId: string;
  readonly dayGroupId: string;
  readonly profileId: string;
}

export interface AnnualLoadCalendar {
  readonly version: 2;
  readonly mode: AnnualCalendarMode;
  readonly dayGroups: readonly AnnualDayGroup[];
  readonly periods: readonly AnnualPeriod[];
  readonly assignments: readonly AnnualProfileAssignment[];
}

export interface AnnualHourlyProfile {
  readonly id: string;
  readonly hourlyEnergyWh: readonly number[];
  readonly hourlyPeakPowerW?: readonly number[];
}

export interface AnnualWeatherPoint {
  readonly timestampUtcIso: string;
  readonly poaWm2: number;
}

export interface AnnualLoadPoint {
  readonly timestampUtcIso: string;
  readonly localDateIso: string;
  readonly localHourIndex: number;
  readonly periodId: string;
  readonly dayGroupId: string;
  readonly profileId: string;
  readonly activeEnergyWh: number;
  readonly peakPowerW: number;
}

export interface AnnualLoadSeries {
  readonly timezoneIana: string;
  readonly points: readonly AnnualLoadPoint[];
}

export interface AnnualYEnContribution {
  readonly periodId: string;
  readonly dayGroupId: string;
  readonly dayCount: number;
  readonly dailyTotalLoadEnergyWh: number;
  readonly meanDailyFavorableLoadEnergyWh: number;
  readonly localGammaRatio: number;
  readonly annualEnergyWeightWh: number;
  readonly weightedGammaEnergyWh: number;
}

export type AnnualYEnResult =
  | {
    readonly status: 'available';
    readonly annualGammaRatio: number;
    readonly numeratorWh: number;
    readonly denominatorWh: number;
    readonly contributions: readonly AnnualYEnContribution[];
  }
  | { readonly status: 'unavailable'; readonly reasonCode: 'LOAD_TOTAL_ZERO' | 'WEATHER_EMPTY' };

export interface CalendarIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
const MONTH_DAY_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u;

/** Validate the calendar as a partition of a non-leap reference year. */
export function validateAnnualCalendar(calendar: AnnualLoadCalendar): readonly CalendarIssue[] {
  const issues: CalendarIssue[] = [];
  if (calendar.version !== 2) issues.push(issue('CALENDAR_VERSION_UNSUPPORTED', 'version', 'Calendar version 2 is required'));
  if (calendar.dayGroups.length === 0) issues.push(issue('CALENDAR_DAY_GROUPS_EMPTY', 'dayGroups', 'At least one day group is required'));
  if (calendar.periods.length === 0) issues.push(issue('CALENDAR_PERIODS_EMPTY', 'periods', 'At least one period is required'));
  const weekdays = calendar.dayGroups.flatMap((group) => group.weekdaysIso);
  if (new Set(weekdays).size !== weekdays.length || weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    issues.push(issue('CALENDAR_WEEKDAYS_INVALID', 'dayGroups.weekdaysIso', 'Weekdays must be unique integers from 1 to 7'));
  }
  if (new Set(weekdays).size !== 7) issues.push(issue('CALENDAR_WEEKDAYS_NOT_PARTITION', 'dayGroups', 'Day groups must cover the seven weekdays exactly'));
  const dayGroupIds = new Set(calendar.dayGroups.map((group) => group.id));
  const periodIds = new Set(calendar.periods.map((period) => period.id));
  const profileAssignments = new Set<string>();
  for (const [index, period] of calendar.periods.entries()) {
    if (!MONTH_DAY_RE.test(period.startMonthDay)) issues.push(issue('CALENDAR_PERIOD_START_INVALID', `periods.${index}.startMonthDay`, 'Expected MM-DD'));
    if (!MONTH_DAY_RE.test(period.endMonthDay)) issues.push(issue('CALENDAR_PERIOD_END_INVALID', `periods.${index}.endMonthDay`, 'Expected MM-DD'));
  }
  for (const [index, assignment] of calendar.assignments.entries()) {
    if (!periodIds.has(assignment.periodId)) issues.push(issue('CALENDAR_ASSIGNMENT_PERIOD_UNKNOWN', `assignments.${index}.periodId`, 'Assignment references an unknown period'));
    if (!dayGroupIds.has(assignment.dayGroupId)) issues.push(issue('CALENDAR_ASSIGNMENT_DAY_GROUP_UNKNOWN', `assignments.${index}.dayGroupId`, 'Assignment references an unknown day group'));
    const key = `${assignment.periodId}:${assignment.dayGroupId}`;
    if (profileAssignments.has(key)) issues.push(issue('CALENDAR_ASSIGNMENT_DUPLICATE', `assignments.${index}`, 'Each period/day-group combination must be assigned once'));
    profileAssignments.add(key);
  }
  const referenceDays = referenceYearDays();
  for (const day of referenceDays) {
    const matches = calendar.periods.filter((period) => periodContains(period, day));
    if (matches.length !== 1) issues.push(issue(matches.length === 0 ? 'CALENDAR_PERIOD_GAP' : 'CALENDAR_PERIOD_OVERLAP', `periods@${day}`, 'Periods must cover every calendar day exactly once'));
  }
  if (calendar.mode === 'annual' && (calendar.dayGroups.length !== 1 || calendar.periods.length !== 1)) {
    issues.push(issue('CALENDAR_ANNUAL_SHAPE_INVALID', 'mode', 'Annual mode requires one day group and one period'));
  }
  if (calendar.mode === 'workweek-weekend' && (calendar.dayGroups.length !== 2 || calendar.periods.length !== 1)) {
    issues.push(issue('CALENDAR_WEEKEND_SHAPE_INVALID', 'mode', 'Workweek/weekend mode requires two day groups and one period'));
  }
  if (calendar.mode === 'periods' && calendar.dayGroups.length !== 1) {
    issues.push(issue('CALENDAR_PERIODS_SHAPE_INVALID', 'mode', 'Periods mode requires one all-days group'));
  }
  if (calendar.mode === 'periods' && calendar.dayGroups.some((group) => group.kind !== 'all-days')) {
    issues.push(issue('CALENDAR_PERIODS_GROUP_INVALID', 'dayGroups', 'Periods mode requires an all-days group'));
  }
  if (calendar.mode === 'periods-by-day-type' && calendar.dayGroups.length !== 2) {
    issues.push(issue('CALENDAR_PERIOD_DAY_TYPE_SHAPE_INVALID', 'mode', 'Period/day-type mode requires workweek and weekend groups'));
  }
  return dedupeIssues(issues);
}

export function resolveAnnualAssignment(calendar: AnnualLoadCalendar, localDateIso: string): { readonly periodId: string; readonly dayGroupId: string } | null {
  if (!ISO_DATE_RE.test(localDateIso)) return null;
  const date = new Date(`${localDateIso}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  const period = calendar.periods.find((candidate) => periodContains(candidate, localDateIso));
  if (!period) return null;
  const isoWeekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const dayGroup = calendar.dayGroups.find((candidate) => candidate.weekdaysIso.includes(isoWeekday));
  return dayGroup ? { periodId: period.id, dayGroupId: dayGroup.id } : null;
}

export function buildAnnualLoadSeries(input: {
  readonly timezoneIana: string;
  readonly weather: readonly AnnualWeatherPoint[];
  readonly calendar: AnnualLoadCalendar;
  readonly profiles: readonly AnnualHourlyProfile[];
}): AnnualLoadSeries {
  const issues = validateAnnualCalendar(input.calendar);
  if (issues.length > 0) throw new RangeError(issues.map((item) => `${item.code}:${item.path}`).join(','));
  if (input.weather.length === 0) throw new RangeError('WEATHER_EMPTY');
  const profiles = new Map(input.profiles.map((profile) => [profile.id, profile]));
  for (const profile of profiles.values()) validateHourlyProfile(profile);
  const assignmentMap = new Map(input.calendar.assignments.map((assignment) => [`${assignment.periodId}:${assignment.dayGroupId}`, assignment.profileId]));
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: input.timezoneIana, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  const points: AnnualLoadPoint[] = [];
  for (const [index, weather] of input.weather.entries()) {
    if (!Number.isFinite(weather.poaWm2) || weather.poaWm2 < 0) throw new RangeError(`WEATHER_POA_INVALID:${index}`);
    const instant = new Date(weather.timestampUtcIso);
    if (!Number.isFinite(instant.getTime())) throw new RangeError(`WEATHER_TIMESTAMP_INVALID:${index}`);
    const local = localParts(instant, formatter);
    const assignment = resolveAnnualAssignment(input.calendar, local.dateIso);
    if (!assignment) throw new RangeError(`CALENDAR_UNRESOLVED:${local.dateIso}`);
    const profileId = assignmentMap.get(`${assignment.periodId}:${assignment.dayGroupId}`);
    const profile = profileId === undefined ? undefined : profiles.get(profileId);
    if (!profile) throw new RangeError(`PROFILE_UNRESOLVED:${assignment.periodId}:${assignment.dayGroupId}`);
    const resolvedProfileId = profile.id;
    // Une journée type se relit à chaque heure locale ; une série annuelle est
    // déjà rangée dans l'ordre de l'année et suit donc le rang de la météo.
    // C'est la même convention que la simulation de fiabilité, qui parcourt
    // les deux séries du même pas : les deux doivent voir la même heure.
    const slot = profile.hourlyEnergyWh.length === 24 ? local.hour : index;
    points.push({
      timestampUtcIso: weather.timestampUtcIso,
      localDateIso: local.dateIso,
      localHourIndex: local.hour,
      periodId: assignment.periodId,
      dayGroupId: assignment.dayGroupId,
      profileId: resolvedProfileId,
      activeEnergyWh: profile.hourlyEnergyWh[slot]!,
      peakPowerW: profile.hourlyPeakPowerW?.[slot] ?? profile.hourlyEnergyWh[slot]!,
    });
  }
  return { timezoneIana: input.timezoneIana, points };
}

/**
 * CALC-P1-012/013. Each local factor is favorable-load energy divided by the
 * total daily load energy. The annual factor weights local factors by the
 * actual energy of each period/day-type combination.
 */
export function calculateAnnualYEn(input: {
  readonly series: AnnualLoadSeries;
  readonly poaByTimestamp: ReadonlyMap<string, number>;
  readonly thresholdWm2: number;
}): AnnualYEnResult {
  if (input.series.points.length === 0) return { status: 'unavailable', reasonCode: 'WEATHER_EMPTY' };
  if (!Number.isFinite(input.thresholdWm2) || input.thresholdWm2 < 0) throw new RangeError('THRESHOLD_INVALID');
  const groups = new Map<string, { periodId: string; dayGroupId: string; dates: Set<string>; daily: Map<string, { total: number; favorable: number }> }>();
  for (const point of input.series.points) {
    const poa = input.poaByTimestamp.get(point.timestampUtcIso);
    if (poa === undefined || !Number.isFinite(poa) || poa < 0) throw new RangeError(`POA_MISSING:${point.timestampUtcIso}`);
    const key = `${point.periodId}:${point.dayGroupId}`;
    let group = groups.get(key);
    if (!group) {
      group = { periodId: point.periodId, dayGroupId: point.dayGroupId, dates: new Set(), daily: new Map() };
      groups.set(key, group);
    }
    group.dates.add(point.localDateIso);
    const day = group.daily.get(point.localDateIso) ?? { total: 0, favorable: 0 };
    day.total += point.activeEnergyWh;
    if (poa >= input.thresholdWm2) day.favorable += point.activeEnergyWh;
    group.daily.set(point.localDateIso, day);
  }
  const contributions: AnnualYEnContribution[] = [...groups.values()].sort((left, right) => left.periodId.localeCompare(right.periodId) || left.dayGroupId.localeCompare(right.dayGroupId)).map((group) => {
    const days = [...group.daily.values()];
    const total = days.reduce((sum, day) => sum + day.total, 0);
    const favorable = days.reduce((sum, day) => sum + day.favorable, 0);
    const dayCount = days.length;
    const dailyTotal = dayCount === 0 ? 0 : total / dayCount;
    const dailyFavorable = dayCount === 0 ? 0 : favorable / dayCount;
    const localGamma = total <= 0 ? 0 : favorable / total;
    return {
      periodId: group.periodId, dayGroupId: group.dayGroupId, dayCount,
      dailyTotalLoadEnergyWh: dailyTotal, meanDailyFavorableLoadEnergyWh: dailyFavorable,
      localGammaRatio: localGamma, annualEnergyWeightWh: total,
      weightedGammaEnergyWh: dailyTotal * dayCount * localGamma,
    };
  });
  const denominatorWh = contributions.reduce((sum, contribution) => sum + contribution.annualEnergyWeightWh, 0);
  if (denominatorWh <= 0) return { status: 'unavailable', reasonCode: 'LOAD_TOTAL_ZERO' };
  const numeratorWh = contributions.reduce((sum, contribution) => sum + contribution.weightedGammaEnergyWh, 0);
  return { status: 'available', annualGammaRatio: numeratorWh / denominatorWh, numeratorWh, denominatorWh, contributions };
}

function validateHourlyProfile(profile: AnnualHourlyProfile): void {
  // 24 : une journée type, que le calendrier répète. 8 760 : l'année déjà
  // écrite heure par heure, qui se lit telle quelle.
  const hours = profile.hourlyEnergyWh.length;
  if ((hours !== 24 && hours !== 8760) || profile.hourlyEnergyWh.some((value) => !Number.isFinite(value) || value < 0)) throw new RangeError(`PROFILE_INVALID:${profile.id}`);
  if (profile.hourlyPeakPowerW !== undefined && (profile.hourlyPeakPowerW.length !== hours || profile.hourlyPeakPowerW.some((value, hour) => !Number.isFinite(value) || value < profile.hourlyEnergyWh[hour]!))) throw new RangeError(`PROFILE_PEAK_INVALID:${profile.id}`);
}

function periodContains(period: AnnualPeriod, dateOrIso: string): boolean {
  const monthDay = dateOrIso.slice(5, 10);
  if (!MONTH_DAY_RE.test(monthDay)) return false;
  return period.startMonthDay <= period.endMonthDay
    ? monthDay >= period.startMonthDay && monthDay <= period.endMonthDay
    : monthDay >= period.startMonthDay || monthDay <= period.endMonthDay;
}

function referenceYearDays(): string[] {
  const days: string[] = [];
  for (let month = 0; month < 12; month += 1) {
    const count = new Date(Date.UTC(2021, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= count; day += 1) days.push(`2021-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return days;
}

function localParts(instant: Date, formatter: Intl.DateTimeFormat): { readonly dateIso: string; readonly hour: number } {
  const parts = formatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? '';
  return { dateIso: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) };
}

function issue(code: string, path: string, message: string): CalendarIssue { return { code, path, message }; }
function dedupeIssues(issues: readonly CalendarIssue[]): readonly CalendarIssue[] { return [...new Map(issues.map((item) => [`${item.code}:${item.path}`, item])).values()]; }
