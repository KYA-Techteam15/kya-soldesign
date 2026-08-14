export interface GeocodedSite {
  readonly name: string;
  readonly countryCode: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly timezoneIana: string;
}

export class GeocodingError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'GeocodingError';
  }
}

export class GeocodingClient {
  public constructor(private readonly fetcher: typeof fetch = fetch) {}

  public async byName(request: { readonly name: string; readonly countryCode: string; readonly language: 'fr' | 'en'; readonly signal?: AbortSignal }): Promise<GeocodedSite> {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', request.name);
    url.searchParams.set('count', '10');
    url.searchParams.set('language', request.language);
    url.searchParams.set('format', 'json');
    url.searchParams.set('countryCode', request.countryCode);
    try {
      const response = await this.fetcher(url, { signal: request.signal });
      if (!response.ok) throw new GeocodingError(`GEOCODING_HTTP_${response.status}`);
      const document = await response.json() as { results?: unknown[] };
      const candidates = (document.results ?? []).flatMap(parseNameResult);
      const found = candidates.find((candidate) => candidate.countryCode === request.countryCode) ?? candidates[0];
      if (!found) throw new GeocodingError('GEOCODING_NOT_FOUND');
      return found;
    } catch (cause) {
      if (cause instanceof GeocodingError) throw cause;
      throw new GeocodingError('GEOCODING_UNAVAILABLE', cause);
    }
  }

  public async byCoordinates(request: { readonly latitudeDeg: number; readonly longitudeDeg: number; readonly language: 'fr' | 'en'; readonly signal?: AbortSignal }): Promise<GeocodedSite> {
    const reverse = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    reverse.searchParams.set('latitude', String(request.latitudeDeg));
    reverse.searchParams.set('longitude', String(request.longitudeDeg));
    reverse.searchParams.set('localityLanguage', request.language);
    const timezone = new URL('https://api.open-meteo.com/v1/forecast');
    timezone.searchParams.set('latitude', String(request.latitudeDeg));
    timezone.searchParams.set('longitude', String(request.longitudeDeg));
    timezone.searchParams.set('current', 'temperature_2m');
    timezone.searchParams.set('forecast_days', '1');
    timezone.searchParams.set('timezone', 'auto');
    try {
      const [reverseResponse, timezoneResponse] = await Promise.all([
        this.fetcher(reverse, { signal: request.signal }),
        this.fetcher(timezone, { signal: request.signal }),
      ]);
      if (!reverseResponse.ok || !timezoneResponse.ok) throw new GeocodingError('GEOCODING_REVERSE_HTTP');
      const place = await reverseResponse.json() as Record<string, unknown>;
      const zone = await timezoneResponse.json() as Record<string, unknown>;
      const name = firstString(place.locality, place.city, place.principalSubdivision);
      const countryCode = firstString(place.countryCode)?.toUpperCase();
      const timezoneIana = firstString(zone.timezone);
      if (!name || !countryCode || !/^[A-Z]{2}$/u.test(countryCode) || !timezoneIana) throw new GeocodingError('GEOCODING_REVERSE_INVALID');
      return { name, countryCode, latitudeDeg: request.latitudeDeg, longitudeDeg: request.longitudeDeg, timezoneIana };
    } catch (cause) {
      if (cause instanceof GeocodingError) throw cause;
      throw new GeocodingError('GEOCODING_UNAVAILABLE', cause);
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
