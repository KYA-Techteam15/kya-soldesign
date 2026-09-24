import { describe, expect, it } from 'vitest';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';

describe('canonical project/view adapters', () => {
  it('creates an unknown-safe canonical file and projects the validated field shape', () => {
    const service = new InMemoryProjects(
      () => '2026-08-13T12:00:00.000Z',
      () => '00000000-0000-4000-8000-000000000001',
    );
    const file = service.create('standalone-all-in-one', 'fr');
    const view = projectFileToView(file);
    expect(view.name).toBe('Nouveau projet');
    expect(view.details.clientName).toBe('');
    expect(view.load.profiles[0]?.appliances).toEqual([]);
    expect(file.inputs).toMatchObject({
      schemaVersion: 1,
      site: { latitudeDeg: null, longitudeDeg: null, arrayTiltDeg: null, arrayAzimuthDeg: null },
    });
    expect(projectViewToFile(view).inputs).toMatchObject({
      site: { latitudeDeg: null, longitudeDeg: null, arrayTiltDeg: null, arrayAzimuthDeg: null },
    });
  });

  it('round-trips explicit project/client/site/load edits without creating calculation evidence', () => {
    const service = new InMemoryProjects(
      () => '2026-08-13T12:00:00.000Z',
      () => '00000000-0000-4000-8000-000000000002',
    );
    const view = projectFileToView(service.create('standalone-all-in-one', 'fr'));
    view.name = 'Centre de santé';
    view.details.clientName = 'District sanitaire';
    view.site.countryCode = 'TG';
    view.site.localityId = 'bombouaka';
    view.site.latitude = 10.703;
    view.site.longitude = 0.2099;
    view.load.profiles[0]?.appliances.push({
      id: 'lighting', name: 'Éclairage', qty: 4,
      unitPower: 18, yield: 0.9, startupCoef: 1, inductive: false,
      operatingFractions: Array.from({ length: 24 }, (_, hour) => hour >= 18 ? 1 : 0),
      opHours: 6,
    });
    const checked = projectViewToFile(view);
    expect(checked.lastCalculation).toBeNull();
    expect(checked.inputs).toMatchObject({
      details: { clientName: 'District sanitaire' },
      site: { countryCode: 'TG', latitudeDeg: 10.703 },
      load: { profiles: [{ items: [{ label: 'Éclairage', usefulPowerW: 18, startupPowerMultiplier: null }] }] },
    });
    const again = projectFileToView(checked);
    expect(again.details.clientName).toBe(view.details.clientName);
    expect(again.load.profiles[0]?.appliances[0]).toMatchObject({ name: 'Éclairage', opHours: 6 });
  });

  it('rejects invalid canonical edits instead of replacing them with defaults', () => {
    const service = new InMemoryProjects(
      () => '2026-08-13T12:00:00.000Z',
      () => '00000000-0000-4000-8000-000000000003',
    );
    const view = projectFileToView(service.create('standalone-all-in-one', 'fr'));
    view.site.localityId = 'invalid-coordinate';
    view.site.latitude = 91;
    expect(() => projectViewToFile(view)).toThrow();
  });
});
