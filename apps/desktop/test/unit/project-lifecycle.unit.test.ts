import { describe, expect, it } from 'vitest';
import { parseProjectFile } from '@ksd/project-format';
import { createEmptyProjectFile, projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { issueProject, issuedSnapshotId, matchesFilter, projectStatus, resolveIssuedSnapshot, reviseProject } from '../../src/app/models/projectLifecycle.js';
import { duplicateProject } from '../../src/app/models/projectTransfer.js';

const ID = '11111111-1111-4111-8111-111111111111';
const blank = () => createEmptyProjectFile(ID, 'standalone-all-in-one', '2026-09-01T08:00:00.000Z', 'Centre');

describe('project lifecycle (spec 011, FR-008 → FR-011)', () => {
  it('reads a 1.0 file without versions as never issued', () => {
    const view = projectFileToView(blank());
    expect(view.issue).toEqual({ locked: false, versions: [] });
    expect('issue' in projectViewToFile(view)).toBe(false);
  });

  it('freezes a numbered version and locks the file', () => {
    const issued = issueProject(blank(), '2026-09-02T10:00:00.000Z');
    expect(issued.issue?.locked).toBe(true);
    expect(issued.issue?.versions.map((version) => version.number)).toEqual([1]);
    expect(issued.issue?.versions[0]?.issuedAt).toBe('2026-09-02T10:00:00.000Z');
    expect(() => issueProject(issued)).toThrow('PROJECT_ALREADY_ISSUED');
    // Le format relu reste valide et conserve la version.
    expect(parseProjectFile(JSON.parse(JSON.stringify(issued))).issue?.versions).toHaveLength(1);
  });

  it('opens revision N+1 without touching the issued version', () => {
    const first = issueProject(blank(), '2026-09-02T10:00:00.000Z');
    const revised = reviseProject(first, '2026-09-03T10:00:00.000Z');
    expect(revised.issue?.locked).toBe(false);
    const view = projectFileToView(revised);
    view.name = 'Centre révisé';
    const second = issueProject(projectViewToFile(view), '2026-09-04T10:00:00.000Z');
    expect(second.issue?.versions.map((version) => [version.number, version.snapshot.name])).toEqual([[1, 'Centre'], [2, 'Centre révisé']]);
    expect(() => reviseProject(revised)).toThrow('PROJECT_NOT_ISSUED');
  });

  it('rebuilds an issued version from its snapshot, under its own identifier', () => {
    const first = issueProject(blank(), '2026-09-02T10:00:00.000Z');
    const view = projectFileToView(reviseProject(first));
    view.name = 'Modifié après émission';
    const current = projectViewToFile(view);
    const snapshot = resolveIssuedSnapshot([current], issuedSnapshotId(ID, 1));
    expect(snapshot?.name).toBe('Centre');
    expect(snapshot?.id).toBe(`${ID}~v1`);
    expect(resolveIssuedSnapshot([current], issuedSnapshotId(ID, 9))).toBeNull();
  });

  it('starts a duplicate as a draft', () => {
    expect(duplicateProject(issueProject(blank())).issue).toBeUndefined();
  });

  it('derives the displayed state and the home filters', () => {
    const view = projectFileToView(blank());
    expect(projectStatus(view, { done: 0, total: 7 })).toBe('draft');
    expect(projectStatus(view, { done: 3, total: 7 })).toBe('in-progress');
    expect(projectStatus(view, { done: 7, total: 7 })).toBe('ready');
    const issued = projectFileToView(issueProject(blank()));
    expect(projectStatus(issued, { done: 7, total: 7 })).toBe('issued');
    expect(projectStatus(projectFileToView(reviseProject(issueProject(blank()))), { done: 5, total: 7 })).toBe('revision');
    expect(matchesFilter('revision', false, 'in-progress')).toBe(true);
    expect(matchesFilter('ready', true, 'stale')).toBe(true);
    expect(matchesFilter('issued', false, 'ready')).toBe(false);
  });
});
