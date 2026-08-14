export interface GeocodedSite {
  readonly name: string;
  readonly countryCode: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly timezoneIana: string;
}

export type GeocodingErrorCode =
  | 'GEOCODING_NOT_FOUND'
  | 'GEOCODING_HTTP'
  | 'GEOCODING_INVALID'
  | 'GEOCODING_TIMEOUT'
  | 'GEOCODING_ABORTED'
  | 'GEOCODING_UNAVAILABLE';

export class GeocodingError extends Error {
  public constructor(public readonly code: GeocodingErrorCode, cause?: unknown) {
    super(code, { cause });
    this.name = 'GeocodingError';
  }
}

export class GeocodingClient {
  public constructor(
    private readonly fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init),
    private readonly timeoutMs = 15_000,
  ) {}

  public async byName(request: { readonly name: string; readonly countryCode: string; readonly language: 'fr' | 'en'; readonly signal?: AbortSignal }): Promise<GeocodedSite> {
    const query = new URLSearchParams({
      name: request.name,
      count: '10',
      language: request.language,
      format: 'json',
      countryCode: request.countryCode,
    });
    const document = await this.fetchJson(`/external/open-meteo/geocoding?${query}`, request.signal) as { results?: unknown[] };
    const candidates = (document.results ?? []).flatMap(parseNameResult);
    const found = candidates.find((candidate) => candidate.countryCode === request.countryCode) ?? candidates[0];
    if (!found) throw new GeocodingError('GEOCODING_NOT_FOUND');
    return found;
  }

  public async byCoordinates(request: { readonly latitudeDeg: number; readonly longitudeDeg: number; readonly language: 'fr' | 'en'; readonly signal?: AbortSignal }): Promise<GeocodedSite> {
    const coordinates = {
      latitude: String(request.latitudeDeg),
      longitude: String(request.longitudeDeg),
    };
    const reverseQuery = new URLSearchParams({ ...coordinates, localityLanguage: request.language });
    const timezoneQuery = new URLSearchParams({
      ...coordinates,
      current: 'temperature_2m',
      forecast_days: '1',
      timezone: 'auto',
    });
    const [place, zone] = await Promise.all([
      this.fetchJson(`/external/bigdatacloud/reverse-geocode?${reverseQuery}`, request.signal),
      this.fetchJson(`/external/open-meteo/forecast?${timezoneQuery}`, request.signal),
    ]);
    const name = firstString(place.locality, place.city, place.principalSubdivision);
    const countryCode = firstString(place.countryCode)?.toUpperCase();
    const timezoneIana = firstString(zone.timezone);
    if (!name || !countryCode || !/^[A-Z]{2}$/u.test(countryCode) || !timezoneIana) {
      throw new GeocodingError('GEOCODING_INVALID');
    }
    return { name, countryCode, latitudeDeg: request.latitudeDeg, longitudeDeg: request.longitudeDeg, timezoneIana };
  }

  private async fetchJson(path: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort('caller');
    signal?.addEventListener('abort', forwardAbort, { once: true });
    const timeout = setTimeout(() => controller.abort('timeout'), this.timeoutMs);
    try {
      const response = await this.fetcher(path, { signal: controller.signal });
      if (!response.ok) throw new GeocodingError('GEOCODING_HTTP');
      let document: unknown;
      try {
        document = JSON.parse(await response.text());
      } catch (cause) {
        throw new GeocodingError('GEOCODING_INVALID', cause);
      }
      if (typeof document !== 'object' || document === null || Array.isArray(document)) {
        throw new GeocodingError('GEOCODING_INVALID');
      }
      return document as Record<string, unknown>;
    } catch (cause) {
      if (cause instanceof GeocodingError) throw cause;
      if (controller.signal.aborted) {
        throw new GeocodingError(controller.signal.reason === 'timeout' ? 'GEOCODING_TIMEOUT' : 'GEOCODING_ABORTED', cause);
      }
      throw new GeocodingError('GEOCODING_UNAVAILABLE', cause);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }
}

function parseNameResult(value: unknown): GeocodedSite[] {
  if (typeof value !== 'object' || value === null) return [];
  const row = value as Record<string, unknown>;
  const name = firstString(row.name);
  const countryCode = firstString(row.country_code)?.toUpperCase();
  const timezoneIana = firstString(row.timezone);
  const latitudeDeg = typeof row.latitude === 'number' ? row.latitude : Number.NaN;
  const longitudeDeg = typeof row.longitude === 'number' ? row.longitude : Number.NaN;
  return name && countryCode && timezoneIana && Number.isFinite(latitudeDeg) && Number.isFinite(longitudeDeg)
    ? [{ name, countryCode, timezoneIana, latitudeDeg, longitudeDeg }]
    : [];
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim();
}
