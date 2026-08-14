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

  it('rejects malformed input and reports HTTP failures without inventing data', async () => {
    const client = new PvgisClient(vi.fn(async () => new Response('', { status: 503 })) as typeof fetch);
    await expect(client.parseTmyJson({ text: '{}', filename: 'bad.json', timezoneIana: 'Africa/Lome' })).rejects.toMatchObject({ code: 'PVGIS_INVALID_JSON' });
    await expect(client.downloadTmy({ latitudeDeg: 10.703, longitudeDeg: 0.2099, timezoneIana: 'Africa/Lome' })).rejects.toEqual(expect.objectContaining<Partial<WeatherAcquisitionError>>({ code: 'PVGIS_HTTP' }));
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
