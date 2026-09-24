import { describe, expect, it } from 'vitest';
import { createEmptyProjectFile } from '../../src/app/models/projectAdapters.js';
import { duplicateProject, inspectProjectImport, parseProjectTransfer, serializeProject } from '../../src/app/models/projectTransfer.js';
import { assessDocumentReadiness } from '../../src/app/models/documentReadiness.js';
import { projectFileToView } from '../../src/app/models/projectAdapters.js';
import { BrowserReportAssetRepository } from '../../src/app/adapters/reportAssetRepository.js';

const project = createEmptyProjectFile('00000000-0000-4000-8000-000000000020', 'standalone-all-in-one', '2026-08-27T00:00:00.000Z', 'Projet test');

describe('project transfer and document readiness', () => {
  it('round-trips a canonical project envelope', () => {
    expect(parseProjectTransfer(JSON.parse(serializeProject(project, '0.1.0', '2026-08-27T01:00:00.000Z')))).toEqual(project);
  });

  it('detects invalid and conflicting imports without mutating anything', () => {
    expect(inspectProjectImport('{invalid', [project]).status).toBe('invalid');
    expect(inspectProjectImport(serializeProject(project), [project])).toMatchObject({ status: 'valid-conflict', sameContent: true });
    expect(inspectProjectImport(serializeProject(project), []).status).toBe('valid-new');
  });

  it('duplicates with a new identity and preserves canonical inputs', () => {
    const copy = duplicateProject(project, () => '00000000-0000-4000-8000-000000000021', () => '2026-08-27T02:00:00.000Z');
    expect(copy).toMatchObject({ id: '00000000-0000-4000-8000-000000000021', name: 'Projet test · copie', createdAt: '2026-08-27T02:00:00.000Z' });
    expect(copy.inputs).toEqual(project.inputs);
  });

  it('returns blockers and warnings as separate document states', () => {
    const view = projectFileToView(project);
    const missing = { presizing: 'missing', sizing: 'missing', finance: 'missing', protectionsValid: 0 } as const;
    const proforma = assessDocumentReadiness({ project: view, kind: 'proforma', facts: missing, withPrices: true, companyName: '' });
    expect(proforma.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(['FINANCE_MISSING', 'SIZING_MISSING']));
    const stale = assessDocumentReadiness({ project: view, kind: 'rapport', facts: { ...missing, sizing: 'stale', finance: 'stale' }, withPrices: true, companyName: 'KYA' });
    expect(stale.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(['SIZING_STALE', 'FINANCE_STALE']));
    const technical = assessDocumentReadiness({ project: view, kind: 'rapport', facts: { ...missing, sizing: 'ready' }, withPrices: false, companyName: '' });
    expect(technical.blockers.map((item) => item.code)).not.toContain('FINANCE_MISSING');
    expect(technical.warnings.map((item) => item.code)).toContain('COMPANY_MISSING');
  });

  it('validates report assets before replacing the configured asset', async () => {
    const repository = new BrowserReportAssetRepository();
    const valid = await repository.store(new File(['logo'], 'logo.svg', { type: 'image/svg+xml' }), 'logo');
    expect((await repository.get(valid.id))?.filename).toBe('logo.svg');
    await expect(repository.store(new File(['<script>bad</script>'], 'bad.svg', { type: 'image/svg+xml' }), 'logo')).rejects.toThrow('REPORT_ASSET_UNSAFE_SVG');
    await repository.remove(valid.id);
    expect(await repository.get(valid.id)).toBeNull();
  });
});
