import { describe, expect, it } from 'vitest';
import { LEGACY_PROJECTS_KEY, PersistentProjects } from '../../src/app/persistence/persistentProjects.js';
import { MemoryProjectStore } from '../../src/app/persistence/projectStore.js';
import { createEmptyProjectFile } from '../../src/app/models/projectAdapters.js';

const NOW = '2026-09-23T10:00:00.000Z';
let sequence = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
}

describe('PersistentProjects', () => {
  it('writes each project separately, without a 5 MB ceiling', async () => {
    const store = new MemoryProjectStore();
    const service = await PersistentProjects.open(store, { legacy: null, now: () => NOW, createId: nextId });
    for (let index = 0; index < 30; index += 1) service.create('standalone-all-in-one', 'fr');
    await service.flushNow();
    expect(store.snapshot()).toHaveLength(30);
    const reopened = await PersistentProjects.open(store, { legacy: null });
    expect(reopened.list()).toHaveLength(30);
  });

  it('keeps a failed write pending and publishes the error until a retry succeeds', async () => {
    const store = new MemoryProjectStore();
    const service = await PersistentProjects.open(store, { legacy: null, now: () => NOW, createId: nextId });
    const states: string[] = [];
    service.subscribe(() => states.push(service.getSaveState().status));
    store.failNextWrites = 1;
    const project = service.create('standalone-all-in-one', 'fr');
    await service.flushNow();
    expect(service.getSaveState().status).toBe('error');
    expect(service.hasPendingWrites()).toBe(true);
    expect(store.snapshot()).toHaveLength(0);
    await service.retry();
    expect(service.getSaveState().status).toBe('saved');
    expect(store.snapshot().map((record) => record.id)).toEqual([project.id]);
    expect(states).toContain('error');
  });

  it('migrates legacy localStorage projects once and keeps a reversible copy', async () => {
    const legacyProject = createEmptyProjectFile(nextId(), 'standalone-all-in-one', NOW, 'Ancien projet');
    const legacy = memoryStorage({ [LEGACY_PROJECTS_KEY]: JSON.stringify({ version: 1, projects: [legacyProject] }) });
    const store = new MemoryProjectStore();
    const service = await PersistentProjects.open(store, { legacy });
    expect(service.get(legacyProject.id)?.name).toBe('Ancien projet');
    expect(store.snapshot()).toHaveLength(1);
    expect(legacy.values.has(LEGACY_PROJECTS_KEY)).toBe(false);
    expect(legacy.values.has(`${LEGACY_PROJECTS_KEY}.migrated`)).toBe(true);
  });

  it('counts unreadable records instead of dropping them from the store', async () => {
    const store = new MemoryProjectStore([{ id: 'broken', json: '{not json', updatedAt: NOW }]);
    const service = await PersistentProjects.open(store, { legacy: null });
    expect(service.list()).toEqual([]);
    expect(service.getSaveState().unreadable).toBe(1);
    expect(store.snapshot()).toHaveLength(1);
  });

  it('deletes from the store and can restore', async () => {
    const store = new MemoryProjectStore();
    const service = await PersistentProjects.open(store, { legacy: null, now: () => NOW, createId: nextId });
    const project = service.create('standalone-all-in-one', 'fr');
    await service.flushNow();
    service.remove(project.id);
    await service.flushNow();
    expect(store.snapshot()).toHaveLength(0);
    service.add(project);
    await service.flushNow();
    expect(store.snapshot()).toHaveLength(1);
  });
});
