import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PvgisClient, WeatherAcquisitionError } from '../../src/app/adapters/pvgisClient.js';

const weatherPath = resolve(import.meta.dirname, '../../../../packages/catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json');

describe('PVGIS acquisition port', () => {
  it('parses and fingerprints a strict 8760-row JSON file', async () => {
    const text = await readFile(weatherPath, 'utf8');
    const client = new PvgisClient(fetch, () => '2026-08-14T06:00:00.000Z');
    const result = await client.parseTmyJson({ text, filename: 'bombouaka.json', timezoneIana: 'Africa/Lome' });
    expect(result.file.document.outputs.tmy_hourly).toHaveLength(8_760);
    expect(result.file.metadata.sourceSha256).toBe('05dffc44112ac96fecf01143abc63d2d32faf88df069fb15485229a999ebb3a6');
    expect(result.locator).toBe('file:bombouaka.json');
  });

  it('accepts an official Accra-like file without altering signed auxiliary evidence', async () => {
    const document = JSON.parse(await readFile(weatherPath, 'utf8')) as {
      outputs: { tmy_hourly: Array<Record<string, number | string>> };
    };
    document.outputs.tmy_hourly[0]!['IR(h)'] = -22.25;
    document.outputs.tmy_hourly[0]!.WS10m = -2.87;
    const client = new PvgisClient(fetch, () => '2026-08-14T06:00:00.000Z');
    const result = await client.parseTmyJson({
      text: JSON.stringify(document),
      filename: 'accra.json',
      timezoneIana: 'Africa/Accra',
    });

    expect(result.file.document.outputs.tmy_hourly).toHaveLength(8_760);
    expect(result.file.document.outputs.tmy_hourly[0]).toMatchObject({ 'IR(h)': -22.25, WS10m: -2.87 });
  });

  it('rejects malformed input and reports HTTP failures without inventing data', async () => {
    const client = new PvgisClient(vi.fn(async () => new Response('', { status: 503 })) as typeof fetch);
    await expect(client.parseTmyJson({ text: '{}', filename: 'bad.json', timezoneIana: 'Africa/Lome' })).rejects.toMatchObject({ code: 'PVGIS_INVALID_JSON' });
    await expect(client.downloadTmy({ latitudeDeg: 10.703, longitudeDeg: 0.2099, timezoneIana: 'Africa/Lome' })).rejects.toEqual(expect.objectContaining<Partial<WeatherAcquisitionError>>({ code: 'PVGIS_HTTP' }));
  });

  it('downloads through the same-origin gateway while preserving the public PVGIS locator', async () => {
    const text = await readFile(weatherPath, 'utf8');
    const fetcher = vi.fn(async () => new Response(text, { status: 200 })) as typeof fetch;
    const result = await new PvgisClient(fetcher).downloadTmy({
      latitudeDeg: 13.51366, longitudeDeg: 2.1098, timezoneIana: 'Africa/Niamey',
    });

    expect(fetcher).toHaveBeenCalledWith(
      '/external/pvgis/tmy?lat=13.51366&lon=2.1098&outputformat=json&usehorizon=1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.locator).toBe('https://re.jrc.ec.europa.eu/api/v5_3/tmy?lat=13.51366&lon=2.1098&outputformat=json&usehorizon=1');
  });

  it('reports a network outage separately from invalid PVGIS JSON', async () => {
    const client = new PvgisClient(vi.fn(async () => { throw new TypeError('offline'); }) as typeof fetch);
    await expect(client.downloadTmy({ latitudeDeg: 13.51366, longitudeDeg: 2.1098, timezoneIana: 'Africa/Niamey' }))
      .rejects.toMatchObject({ code: 'PVGIS_UNAVAILABLE' });
  });

  it('reports a rejected HTML response as an upstream refusal', async () => {
    const client = new PvgisClient(vi.fn(async () => new Response('<html>Request Rejected</html>', { status: 200 })) as typeof fetch);
    await expect(client.downloadTmy({ latitudeDeg: 13.51366, longitudeDeg: 2.1098, timezoneIana: 'Africa/Niamey' }))
      .rejects.toMatchObject({ code: 'PVGIS_HTTP' });
  });

  it('supports cancellation', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))) as typeof fetch;
    const controller = new AbortController();
    const client = new PvgisClient(fetcher);
    const pending = client.downloadTmy({ latitudeDeg: 10.703, longitudeDeg: 0.2099, timezoneIana: 'Africa/Lome', signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'PVGIS_ABORTED' });
  });
});
