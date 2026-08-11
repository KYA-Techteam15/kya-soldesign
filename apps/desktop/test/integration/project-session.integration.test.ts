import { describe, expect, it } from 'vitest';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';

describe('in-memory project session', () => {
  it('starts empty and creates a versioned AIO draft', () => {
    const projects = new InMemoryProjects(() => '2026-08-11T00:00:00.000Z');
    expect(projects.list()).toEqual([]);
    const project = projects.create('standalone-all-in-one', 'fr');
    expect(project.lastCalculation).toBeNull();
    expect(project.system).toBe('standalone-all-in-one');
    expect(projects.get(project.id)).toEqual(project);
  });
});
