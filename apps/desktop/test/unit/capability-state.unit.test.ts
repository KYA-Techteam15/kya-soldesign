import { describe, expect, it } from 'vitest';
import { unavailableCalculations } from '../../src/app/adapters/unavailableCalculations.js';

describe('unavailable calculations adapter', () => {
  it('never fabricates an engineering result', async () => {
    const state = await unavailableCalculations.read('00000000-0000-4000-8000-000000000001', 'presizing');
    expect(state).toEqual({
      status: 'unavailable',
      capability: 'presizing',
      reasonKey: 'capability.presizing.unavailable',
      roadmapOwner: 'AIO-001',
    });
    expect('envelope' in state).toBe(false);
  });
});
