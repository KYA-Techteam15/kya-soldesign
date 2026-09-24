import { describe, expect, it } from 'vitest';
import { providerUrl } from '../../src/app/adapters/weatherGateway.js';

describe('providerUrl (hôte de bureau)', () => {
  it('maps every gateway route to the real provider', () => {
    expect(providerUrl('/external/pvgis/tmy?lat=10.7&lon=0.2&outputformat=json', null)).toBe('https://re.jrc.ec.europa.eu/api/v5_3/tmy?lat=10.7&lon=0.2&outputformat=json');
    expect(providerUrl('/external/open-meteo/geocoding?name=Lome', null)).toBe('https://geocoding-api.open-meteo.com/v1/search?name=Lome');
    expect(providerUrl('/external/open-meteo/forecast?latitude=1', null)).toBe('https://api.open-meteo.com/v1/forecast?latitude=1');
    expect(providerUrl('/external/bigdatacloud/reverse-geocode?latitude=1', null)).toBe('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=1');
  });

  it('switches Open-Meteo to the commercial domain with an API key', () => {
    expect(providerUrl('/external/open-meteo/geocoding?name=Lome', 'k 1')).toBe('https://customer-geocoding-api.open-meteo.com/v1/search?name=Lome&apikey=k%201');
  });

  it('refuses unknown routes instead of guessing', () => {
    expect(providerUrl('/external/unknown', null)).toBeNull();
  });
});
