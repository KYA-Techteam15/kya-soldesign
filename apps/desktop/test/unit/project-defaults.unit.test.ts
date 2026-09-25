import { describe, expect, it } from 'vitest';
import { defaultApplicationSettings } from '../../src/app/models/applicationSettings.js';
import { createEmptyProjectFile, projectFileToView } from '../../src/app/models/projectAdapters.js';
import { applyProjectDefaults } from '../../src/app/services/createProject.js';

const blank = () => createEmptyProjectFile('11111111-1111-4111-8111-111111111111', 'standalone-all-in-one', '2026-09-01T08:00:00.000Z', 'Centre');

describe('defaults of a new project (spec 012, FR-A3)', () => {
  it('proposes the usual project officer and today as the project date', () => {
    const settings = { ...defaultApplicationSettings, company: { ...defaultApplicationSettings.company, officer: 'A. Kodjo' } };
    const view = projectFileToView(applyProjectDefaults(blank(), settings));
    expect(view.details.followerName).toBe('A. Kodjo');
    expect(view.details.projectDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it('leaves the officer empty when none is configured', () => {
    expect(projectFileToView(applyProjectDefaults(blank(), defaultApplicationSettings)).details.followerName).toBe('');
  });

  it('keeps project visuals with the project file', () => {
    const view = projectFileToView(blank());
    view.details.documentLogo = 'data:image/png;base64,AAAA';
    expect(view.details.projectImage).toBe('');
  });
});
