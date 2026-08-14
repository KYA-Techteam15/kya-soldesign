import { pvgisTmyJsonSchema, weatherFileRecordSchema, type PvgisTmyJson, type WeatherFileRecord } from '@ksd/catalog';
import type { CanonicalWeatherFile, WeatherAcquisitionPort } from '../contracts.js';

export class WeatherAcquisitionError extends Error {
  public constructor(public readonly code: 'PVGIS_TIMEOUT' | 'PVGIS_HTTP' | 'PVGIS_INVALID_JSON' | 'PVGIS_ABORTED' | 'PVGIS_UNAVAILABLE', cause?: unknown) {
    super(code, { cause });
    this.name = 'WeatherAcquisitionError';
  }
}

export class PvgisClient implements WeatherAcquisitionPort {
  public constructor(
    private readonly fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init),
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly timeoutMs = 30_000,
  ) {}

  public async downloadTmy(request: { readonly latitudeDeg: number; readonly longitudeDeg: number; readonly timezoneIana: string; readonly signal?: AbortSignal }): Promise<{ readonly file: CanonicalWeatherFile; readonly locator: string }> {
    const locator = `https://re.jrc.ec.europa.eu/api/v5_3/tmy?lat=${encodeURIComponent(request.latitudeDeg)}&lon=${encodeURIComponent(request.longitudeDeg)}&outputformat=json&usehorizon=1`;
    const requestUrl = `/external/pvgis/tmy?lat=${encodeURIComponent(request.latitudeDeg)}&lon=${encodeURIComponent(request.longitudeDeg)}&outputformat=json&usehorizon=1`;
    const controller = new AbortController();
    const forwardAbort = () => controller.abort('caller');
    request.signal?.addEventListener('abort', forwardAbort, { once: true });
    const timeout = setTimeout(() => controller.abort('timeout'), this.timeoutMs);
    try {
      const response = await this.fetcher(requestUrl, { signal: controller.signal });
      if (!response.ok) throw new WeatherAcquisitionError('PVGIS_HTTP');
      const text = await response.text();
      if (text.trimStart().startsWith('<')) throw new WeatherAcquisitionError('PVGIS_HTTP');
      return { file: await this.parse(text, locator, request.timezoneIana), locator };
    } catch (cause) {
      if (cause instanceof WeatherAcquisitionError) throw cause;
      if (controller.signal.aborted) throw new WeatherAcquisitionError(controller.signal.reason === 'timeout' ? 'PVGIS_TIMEOUT' : 'PVGIS_ABORTED', cause);
      throw new WeatherAcquisitionError('PVGIS_UNAVAILABLE', cause);
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener('abort', forwardAbort);
    }
  }

  public async parseTmyJson(request: { readonly text: string; readonly filename: string; readonly timezoneIana: string }): Promise<{ readonly file: CanonicalWeatherFile; readonly locator: string }> {
    const locator = `file:${request.filename}`;
    try {
      return { file: await this.parse(request.text, locator, request.timezoneIana), locator };
    } catch (cause) {
      if (cause instanceof WeatherAcquisitionError) throw cause;
      throw new WeatherAcquisitionError('PVGIS_INVALID_JSON', cause);
    }
  }

  private async parse(text: string, locator: string, timezoneIana: string): Promise<CanonicalWeatherFile> {
    let document: PvgisTmyJson;
    try { document = pvgisTmyJsonSchema.parse(JSON.parse(text)); }
    catch (cause) { throw new WeatherAcquisitionError('PVGIS_INVALID_JSON', cause); }
    const digest = await sha256(text);
    const id = `weather-file_pvgis53_${digest.slice(0, 16)}`;
    const metadata: WeatherFileRecord = weatherFileRecordSchema.parse({
      id, weatherSourceId: `weather-source_${digest.slice(0, 24)}`, localityId: `locality_${digest.slice(0, 24)}`,
      format: 'pvgis-tmy-json', relativePath: `weather/${digest}.json`, sourceSha256: digest, apiVersion: '5.3',
      providerEndpoint: 'https://re.jrc.ec.europa.eu/api/v5_3/tmy',
      latitudeDeg: document.inputs.location.latitude, longitudeDeg: document.inputs.location.longitude, timezoneIana,
      radiationDatabase: document.inputs.meteo_data.radiation_db, yearMin: document.inputs.meteo_data.year_min,
      yearMax: document.inputs.meteo_data.year_max, hourlyRecordCount: 8_760, retrievedAtIso: this.now(),
    });
    return { metadata, document };
  }
}

async function sha256(content: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
