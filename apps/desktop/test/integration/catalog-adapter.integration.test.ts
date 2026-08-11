import { describe, expect, it } from 'vitest';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';

describe('canonical catalog adapter', () => {
  it('validates and filters canonical equipment deterministically', async () => {
    const catalog = new CanonicalCatalog();
    const all = await catalog.list();
    const filtered = await catalog.list({ text: all[0]!.manufacturer });
    expect(all.length).toBeGreaterThan(0);
    expect(filtered[0]?.id).toBe(all[0]?.id);
    expect(filtered[0]?.provenance.sourceId).toBeTruthy();
  });

  it('exposes canonical localities and associated weather sources', async () => {
    const catalog = new CanonicalCatalog();
    const localities = await catalog.listLocalities();
    expect(localities.length).toBeGreaterThan(0);
    expect(localities).toEqual([...localities].sort((left, right) => left.name.localeCompare(right.name)));

    const locality = localities.find((candidate) => candidate.countryCode === 'TG') ?? localities[0]!;
    const sources = await catalog.listWeatherSources(locality.id);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((source) => source.localityId === locality.id)).toBe(true);
    expect(sources[0]?.provenance.sourceId).toBeTruthy();
  });
});
