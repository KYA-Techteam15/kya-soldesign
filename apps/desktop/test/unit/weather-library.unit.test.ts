import { describe, expect, it } from 'vitest';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { createSavedWeatherRecord, InMemoryWeatherLibrary, parseSavedWeatherRecord, weatherLibraryKey } from '../../src/app/adapters/weatherLibrary.js';

describe('downloaded weather library', () => {
  it('stores a verified file under a stable locality key and replaces the same locality', async () => {
    const file = (await new CanonicalCatalog().listWeatherFiles())[0]!;
    const first = createSavedWeatherRecord({
      siteName: 'Bombouaka',
      countryCode: 'TG',
      sourceName: 'Bombouaka PVGIS-TMY',
      locator: 'https://re.jrc.ec.europa.eu/api/v5_3/tmy?lat=10.703&lon=0.2099',
      optimalTilt: 15,
      optimalAzimuth: 180,
      timezoneIana: 'Africa/Lome',
      file,
    });
    const library = new InMemoryWeatherLibrary();
    await library.save(first);
    await library.save({ ...first, source: { ...first.source, sourceName: 'Bombouaka actualisée' } });

    const stored = await library.list();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.key).toBe('TG:bombouaka');
    expect(stored[0]?.source.sourceName).toBe('Bombouaka actualisée');
    expect(stored[0]?.file.document.outputs.tmy_hourly).toHaveLength(8_760);
  });

  it('normalizes the key and rejects broken file associations', async () => {
    const file = (await new CanonicalCatalog().listWeatherFiles())[0]!;
    const record = createSavedWeatherRecord({
      siteName: '  BomboUAKA  ', countryCode: 'TG', sourceName: 'PVGIS', locator: 'file:bombouaka.json',
      optimalTilt: 15, optimalAzimuth: 180, timezoneIana: 'Africa/Lome', file,
    });
    expect(weatherLibraryKey('TG', '  BomboUAKA  ')).toBe('TG:bombouaka');
    expect(() => parseSavedWeatherRecord({ ...record, source: { ...record.source, localityId: 'another-locality' } })).toThrow('WEATHER_LIBRARY_ASSOCIATION_INVALID');
  });
});
