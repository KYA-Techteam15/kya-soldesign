import { describe, expect, it } from 'vitest';
import { NAVIGATION_SESSION_STORAGE_KEY, PROJECT_RESUME_STORAGE_KEY, readNavigationSession, readProjectResumeTarget, writeNavigationSession, writeProjectResumeTarget } from '../../src/app/navigationSession.js';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  public getItem(key: string): string | null { return this.values.get(key) ?? null; }
  public setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('navigation session', () => {
  it('round-trips the current workshop route and discards deleted projects', () => {
    const storage = new MemoryStorage();
    const project = { id: 'project-1' };
    writeNavigationSession({
      version: 1, currentProjectId: project.id,
      route: '/projet/' + project.id + '/atelier/besoins', search: '?vue=synthese',
      activeProfileId: 'profile-1', dossierView: 'synthese',
    }, storage);
    expect(storage.getItem(NAVIGATION_SESSION_STORAGE_KEY)).toContain('project-1');
    expect(readNavigationSession([project], storage)).toMatchObject({
      currentProjectId: project.id, route: '/projet/' + project.id + '/atelier/besoins', activeProfileId: 'profile-1',
    });
    expect(readNavigationSession([], storage)).toMatchObject({ currentProjectId: null, route: null });
  });

  it('rejects non-workshop and malformed sessions', () => {
    const storage = new MemoryStorage();
    writeNavigationSession({
      version: 1, currentProjectId: 'p', route: '/accueil', search: '', activeProfileId: null, dossierView: null,
    }, storage);
    expect(readNavigationSession([{ id: 'p' }], storage).route).toBeNull();
    storage.setItem(NAVIGATION_SESSION_STORAGE_KEY, '{bad');
    expect(readNavigationSession([{ id: 'p' }], storage).currentProjectId).toBeNull();
  });

  it('stores a safe resume route per project and ignores deleted or malformed routes', () => {
    const storage = new MemoryStorage();
    writeProjectResumeTarget('p', '/projet/p/atelier/dossier', storage);
    expect(storage.getItem(PROJECT_RESUME_STORAGE_KEY)).toContain('/atelier/dossier');
    expect(readProjectResumeTarget('p', storage)).toBe('/projet/p/atelier/dossier');
    writeProjectResumeTarget('p', '/accueil', storage);
    expect(readProjectResumeTarget('p', storage)).toBe('/projet/p/atelier/dossier');
    expect(readProjectResumeTarget('deleted', storage)).toBeNull();
    storage.setItem(PROJECT_RESUME_STORAGE_KEY, '{bad');
    expect(readProjectResumeTarget('p', storage)).toBeNull();
  });
});
