import type { AnnualLoadPoint, AnnualLoadSeries } from './annual.js';

export type AnnualChartRange = 'year' | 'period' | 'month' | 'week' | 'day' | 'custom-range';
export type AnnualChartFrequency = 'auto' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface AnnualChartQuery {
  readonly range: AnnualChartRange;
  readonly frequency: AnnualChartFrequency;
  readonly periodId?: string;
  readonly month?: number;
  readonly anchorDateIso?: string;
  readonly startDateIso?: string;
  readonly endDateIso?: string;
}

export interface AnnualChartPoint {
  readonly bucket: string;
  readonly startDateIso: string;
  readonly endDateIso: string;
  readonly energyWh: number;
  readonly averagePowerW: number;
  readonly peakPowerW: number;
  readonly meanPoaWm2: number | null;
  readonly sourcePointCount: number;
}

export interface AnnualChartSeries {
  readonly range: AnnualChartRange;
  readonly frequency: Exclude<AnnualChartFrequency, 'auto'>;
  readonly sourcePointCount: number;
  readonly points: readonly AnnualChartPoint[];
}

/** Reduce dense hourly curves while retaining the local minimum and maximum of each bucket. */
export function reduceAnnualChartPoints(points: readonly AnnualChartPoint[], maxPoints = 600): readonly AnnualChartPoint[] {
  if (points.length <= maxPoints || maxPoints < 4) return points;
  const bucketCount = Math.max(1, Math.floor(maxPoints / 2));
  const reduced: AnnualChartPoint[] = [];
  for (let index = 0; index < points.length; index += Math.ceil(points.length / bucketCount)) {
    const bucket = points.slice(index, Math.min(points.length, index + Math.ceil(points.length / bucketCount)));
    const minimum = bucket.reduce((current, point) => point.energyWh < current.energyWh ? point : current, bucket[0]!);
    const maximum = bucket.reduce((current, point) => point.energyWh > current.energyWh ? point : current, bucket[0]!);
    reduced.push(...(minimum.bucket < maximum.bucket ? [minimum, maximum] : [maximum, minimum]));
  }
  return reduced.slice(0, maxPoints);
}

/** Query an already-built annual series using the same rules for the chart and exports. */
export function queryAnnualChart(input: {
  readonly series: AnnualLoadSeries;
  readonly poaByTimestamp?: ReadonlyMap<string, number>;
  readonly query: AnnualChartQuery;
}): AnnualChartSeries {
  const frequency = resolveFrequency(input.query);
  const filtered = input.series.points.filter((point) => matchesRange(point, input.query));
  const buckets = new Map<string, Bucket>();
  for (const point of filtered) {
    const bucketKey = bucketFor(point, frequency);
    const bucket = buckets.get(bucketKey) ?? createBucket(bucketKey, point);
    bucket.endDateIso = point.localDateIso;
    bucket.energyWh += point.activeEnergyWh;
    bucket.peakPowerW = Math.max(bucket.peakPowerW, point.peakPowerW);
    const poa = input.poaByTimestamp?.get(point.timestampUtcIso);
    if (poa !== undefined && Number.isFinite(poa)) {
      bucket.poaTotal += poa;
      bucket.poaCount += 1;
    }
    bucket.sourcePointCount += 1;
    buckets.set(bucketKey, bucket);
  }
  const points = [...buckets.values()].sort((left, right) => left.bucket.localeCompare(right.bucket)).map((bucket) => ({
    bucket: bucket.bucket,
    startDateIso: bucket.startDateIso,
    endDateIso: bucket.endDateIso,
    energyWh: bucket.energyWh,
    averagePowerW: bucket.sourcePointCount === 0 ? 0 : bucket.energyWh / bucket.sourcePointCount,
    peakPowerW: bucket.peakPowerW,
    meanPoaWm2: bucket.poaCount === 0 ? null : bucket.poaTotal / bucket.poaCount,
    sourcePointCount: bucket.sourcePointCount,
  }));
  return { range: input.query.range, frequency, sourcePointCount: filtered.length, points };
}

interface Bucket {
  readonly bucket: string;
  readonly startDateIso: string;
  endDateIso: string;
  energyWh: number;
  peakPowerW: number;
  poaTotal: number;
  poaCount: number;
  sourcePointCount: number;
}

function resolveFrequency(query: AnnualChartQuery): Exclude<AnnualChartFrequency, 'auto'> {
  if (query.frequency !== 'auto') return query.frequency;
  if (query.range === 'week' || query.range === 'day' || query.range === 'custom-range') return 'hourly';
  return 'daily';
}

function matchesRange(point: AnnualLoadPoint, query: AnnualChartQuery): boolean {
  if (query.range === 'year') return true;
  if (query.range === 'period') return query.periodId === undefined || point.periodId === query.periodId;
  if (query.range === 'month') return query.month === undefined || Number(point.localDateIso.slice(5, 7)) === query.month;
  if (query.range === 'day') return query.anchorDateIso === undefined || point.localDateIso === query.anchorDateIso;
  if (query.range === 'custom-range') {
    if (query.startDateIso !== undefined && point.localDateIso < query.startDateIso) return false;
    if (query.endDateIso !== undefined && point.localDateIso > query.endDateIso) return false;
    return true;
  }
  if (query.anchorDateIso === undefined) return true;
  const anchor = dateFromIso(query.anchorDateIso);
  const pointDate = dateFromIso(point.localDateIso);
  const end = new Date(anchor);
  end.setUTCDate(end.getUTCDate() + 6);
  return pointDate >= anchor && pointDate <= end;
}

function bucketFor(point: AnnualLoadPoint, frequency: Exclude<AnnualChartFrequency, 'auto'>): string {
  if (frequency === 'hourly') return `${point.localDateIso}T${String(point.localHourIndex).padStart(2, '0')}`;
  if (frequency === 'daily') return point.localDateIso;
  if (frequency === 'monthly') return point.localDateIso.slice(0, 7);
  const date = dateFromIso(point.localDateIso);
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function createBucket(bucket: string, point: AnnualLoadPoint): Bucket {
  return { bucket, startDateIso: point.localDateIso, endDateIso: point.localDateIso, energyWh: 0, peakPowerW: 0, poaTotal: 0, poaCount: 0, sourcePointCount: 0 };
}

function dateFromIso(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}
