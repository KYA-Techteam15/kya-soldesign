import type { CanonicalWeatherFile } from '../contracts.js';

export interface ProjectWeatherPayload {
  readonly weatherFileId: string;
  readonly sourceSha256: string;
  readonly timezoneOffsetMinutes: number;
  readonly albedo: number;
  readonly hourlyIrradiance: readonly {
    readonly timestampUtcIso: string;
    readonly ghiWm2: number;
    readonly dniWm2: number;
    readonly dhiWm2: number;
  }[];
}

export function pvgisTimestampToIso(value: string): string {
  if (!/^\d{8}:\d{4}$/u.test(value)) throw new RangeError('PVGIS timestamp must use YYYYMMDD:HHMM');
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:00.000Z`;
}

export function canonicalWeatherFileToProjectPayload(file: CanonicalWeatherFile): ProjectWeatherPayload {
  const firstTimestamp = pvgisTimestampToIso(file.document.outputs.tmy_hourly[0]!['time(UTC)']);
  return {
    weatherFileId: file.metadata.id,
    sourceSha256: file.metadata.sourceSha256,
    timezoneOffsetMinutes: timezoneOffsetMinutes(firstTimestamp, file.metadata.timezoneIana),
    albedo: 0.2,
    hourlyIrradiance: file.document.outputs.tmy_hourly.map((row) => ({
      timestampUtcIso: pvgisTimestampToIso(row['time(UTC)']),
      ghiWm2: row['G(h)'],
      dniWm2: row['Gb(n)'],
      dhiWm2: row['Gd(h)'],
    })),
  };
}

function timezoneOffsetMinutes(timestampUtcIso: string, timezoneIana: string): number {
  const instant = new Date(timestampUtcIso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezoneIana, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((part) => part.type === type)?.value);
  const representedAsUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
  return Math.round((representedAsUtc - instant.getTime()) / 60_000);
}
