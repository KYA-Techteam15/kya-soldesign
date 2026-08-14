import { describe, expect, it, vi } from 'vitest';
import { GeocodingClient } from '../../src/app/adapters/geocodingClient.js';

describe('real geocoding adapter', () => {
  it('resolves Niamey through the same-origin gateway and keeps its IANA timezone', async () => {
    const fetcher = vi.fn(async () => Response.json({
      results: [{
        name: 'Niamey', country_code: 'NE', latitude: 13.51366,
        longitude: 2.1098, timezone: 'Africa/Niamey',
      }],
    })) as typeof fetch;
    const result = await new GeocodingClient(fetcher).byName({ name: 'Niamey', countryCode: 'NE', language: 'fr' });

    expect(fetcher).toHaveBeenCalledWith(
      '/external/open-meteo/geocoding?name=Niamey&count=10&language=fr&format=json&countryCode=NE',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result).toEqual({
      name: 'Niamey', countryCode: 'NE', latitudeDeg: 13.51366,
      longitudeDeg: 2.1098, timezoneIana: 'Africa/Niamey',
    });
  });

  it('distinguishes no result, network failure, timeout, and invalid responses', async () => {
    const empty = new GeocodingClient(vi.fn(async () => Response.json({ results: [] })) as typeof fetch);
    await expect(empty.byName({ name: 'Inconnue', countryCode: 'NE', language: 'fr' }))
      .rejects.toMatchObject({ code: 'GEOCODING_NOT_FOUND' });

    const offline = new GeocodingClient(vi.fn(async () => { throw new TypeError('offline'); }) as typeof fetch);
    await expect(offline.byName({ name: 'Niamey', countryCode: 'NE', language: 'fr' }))
      .rejects.toMatchObject({ code: 'GEOCODING_UNAVAILABLE' });

    const invalid = new GeocodingClient(vi.fn(async () => Response.json([])) as typeof fetch);
    await expect(invalid.byName({ name: 'Niamey', countryCode: 'NE', language: 'fr' }))
      .rejects.toMatchObject({ code: 'GEOCODING_INVALID' });

    const pending = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as typeof fetch;
    const timeout = new GeocodingClient(pending, 1);
    await expect(timeout.byName({ name: 'Niamey', countryCode: 'NE', language: 'fr' }))
      .rejects.toMatchObject({ code: 'GEOCODING_TIMEOUT' });
  });

  it('combines reverse locality and timezone evidence for GPS input', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return url.includes('reverse-geocode')
        ? Response.json({ locality: 'Niamey', countryCode: 'NE' })
        : Response.json({ timezone: 'Africa/Niamey' });
    }) as typeof fetch;
    const result = await new GeocodingClient(fetcher).byCoordinates({
      latitudeDeg: 13.51366, longitudeDeg: 2.1098, language: 'fr',
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      name: 'Niamey', countryCode: 'NE', latitudeDeg: 13.51366,
      longitudeDeg: 2.1098, timezoneIana: 'Africa/Niamey',
    });
  });
});
