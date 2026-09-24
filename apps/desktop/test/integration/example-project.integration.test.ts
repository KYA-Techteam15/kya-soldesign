import { beforeAll, describe, expect, it } from 'vitest';
import type { ProjectFileV1 } from '@ksd/project-format';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { AioCalculations } from '../../src/app/adapters/aioCalculations.js';
import { defaultApplicationSettings } from '../../src/app/models/applicationSettings.js';
import { projectFileToView } from '../../src/app/models/projectAdapters.js';
import { issueProject, issuedSnapshotId, resolveIssuedSnapshot } from '../../src/app/models/projectLifecycle.js';
import { createExampleProject, type ExampleReferences } from '../../src/app/services/exampleProject.js';
import { sectionStates } from '../../src/domain/completion.js';
import { buildAnnualLoadPresentationResult } from '../../src/app/models/annualLoadPresentation.js';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';

/** Projet exemple (FR-007) et versions émises réimprimables (FR-010). */
describe('example project and issued versions', () => {
  let references: ExampleReferences;
  let example: ProjectFileV1;

  beforeAll(async () => {
    const catalog = new CanonicalCatalog();
    const [localities, weatherSources, weatherFiles, loadProfiles, equipment] = await Promise.all([catalog.listLocalities(), catalog.listWeatherSources(), catalog.listWeatherFiles(), catalog.listLoadProfiles(), catalog.list()]);
    references = { localities, weatherSources, weatherFiles, loadProfiles, equipment };
    example = await createExampleProject(references, defaultApplicationSettings, 'fr');
  }, 60_000);

  const calculationsOver = (projects: () => readonly ProjectFileV1[]) =>
    new AioCalculations((id) => projects().find((project) => project.id === id) ?? resolveIssuedSnapshot(projects(), id), references);

  it('opens complete, on the catalog equipment it names, with every step done', () => {
    const view = projectFileToView(example);
    for (const id of Object.values(view.selection)) expect(references.equipment.some((item) => item.id === id)).toBe(true);
    const states = sectionStates(view);
    expect(Object.fromEntries(Object.entries(states).map(([key, state]) => [key, state.level]))).toEqual({
      projet: 'done', site: 'done', besoins: 'done', hypotheses: 'done', materiel: 'done', protections: 'done', chiffrage: 'done', dossier: 'done',
    });
  });

  it('is calculated by the current engine: nothing to rerun', async () => {
    const calculations = calculationsOver(() => [example]);
    expect((await calculations.read(example.id, 'presizing')).status).toBe('ready');
    expect((await calculations.read(example.id, 'sizing')).status).toBe('ready');
    expect((await calculations.read(example.id, 'finance')).status).toBe('ready');
  });

  it('builds the annual load view when several appliances run in the same hour', async () => {
    const solar = await calculationsOver(() => [example]).read<SolarResourceAnalysisOutputV1>(example.id, 'solar-resource');
    const result = buildAnnualLoadPresentationResult(projectFileToView(example), solar.status === 'ready' ? solar.envelope.output : null);
    // La pointe horaire valait le plus gros appareil seul : la série était refusée (PROFILE_PEAK_INVALID).
    expect(result.status).toBe('ready');
  });

  it('refuses new calculations once issued, and serves the issued version as delivered', async () => {
    const issued = issueProject(example);
    const calculations = calculationsOver(() => [issued]);
    await expect(calculations.runPresizing(issued.id, () => undefined)).rejects.toThrow('PROJECT_ISSUED');
    const snapshotId = issuedSnapshotId(issued.id, 1);
    expect((await calculations.read(snapshotId, 'sizing')).status).toBe('ready');
    expect((await calculations.read(snapshotId, 'finance')).status).toBe('ready');
    expect(issued.issue?.versions[0]?.fingerprints.sizing).toBe(example.sizingCalculation?.inputHash);
  });
});
