import { describe, expect, it } from 'vitest';
import { BrowserProjects, PROJECTS_STORAGE_KEY } from '../../src/app/adapters/browserProjects.js';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const NOW = '2026-08-18T10:00:00.000Z';

describe('BrowserProjects', () => {
  it('persists a created project for the next application session', () => {
    const storage = new MemoryStorage();
    const projects = new BrowserProjects(storage, () => NOW, () => '00000000-0000-4000-8000-000000000001');

    const created = projects.create('standalone-all-in-one', 'fr');
    const stored = JSON.parse(storage.getItem(PROJECTS_STORAGE_KEY) ?? '{}') as {
      version?: number;
      projects?: unknown[];
    };

    expect(stored.version).toBe(1);
    expect(stored.projects).toHaveLength(1);
    expect(created).toMatchObject({ id: '00000000-0000-4000-8000-000000000001', name: 'Nouveau projet', createdAt: NOW });
    expect(new BrowserProjects(storage).get(created.id)).toEqual(created);
  });

  it('persists project updates and deletion', () => {
    const storage = new MemoryStorage();
    const projects = new BrowserProjects(storage, () => NOW, () => '00000000-0000-4000-8000-000000000002');
    const created = projects.create('grid-tied', 'fr');

    projects.replace({ ...created, name: 'Projet Lomé', updatedAt: '2026-08-18T11:00:00.000Z' });
    expect(new BrowserProjects(storage).get(created.id)?.name).toBe('Projet Lomé');

    projects.remove(created.id);
    expect(new BrowserProjects(storage).list()).toEqual([]);
  });

  it('ignores corrupt storage and invalid project records', () => {
    const corruptStorage = new MemoryStorage();
    corruptStorage.setItem(PROJECTS_STORAGE_KEY, '{invalid json');
    expect(new BrowserProjects(corruptStorage).list()).toEqual([]);

    const mixedStorage = new MemoryStorage();
    const valid = new BrowserProjects(mixedStorage, () => NOW, () => '00000000-0000-4000-8000-000000000003')
      .create('solar-pumping', 'fr');
    mixedStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({
      version: 1,
      projects: [{ id: 'invalid' }, valid],
    }));

    expect(new BrowserProjects(mixedStorage).list()).toEqual([valid]);
  });
});
