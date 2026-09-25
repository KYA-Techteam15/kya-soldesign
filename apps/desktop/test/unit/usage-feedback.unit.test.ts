import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulatedUsageApi, type UsageBatch } from '../../src/app/feedback/usageApi.js';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
}

const storage = memoryStorage();
vi.stubGlobal('localStorage', storage);

// Le module lit le consentement à son chargement : il est importé après la mise en place du stockage.
let usage: typeof import('../../src/app/feedback/usage.js');
beforeAll(async () => { usage = await import('../../src/app/feedback/usage.js'); });

class RecordingApi extends SimulatedUsageApi {
  readonly batches: UsageBatch[] = [];
  override async sendEvents(batch: UsageBatch): Promise<void> { this.batches.push(batch); await super.sendEvents(batch); }
}

describe('anonymous usage (spec 012, FR-F1, FR-F2)', () => {
  beforeEach(() => {
    storage.clear();
    usage.useUsage.setState({ consent: null, threads: [], composing: null });
  });

  it('queues nothing until the user has answered, and nothing after a refusal', () => {
    usage.track('project.create');
    expect(usage.pendingUsageEvents()).toHaveLength(0);
    usage.useUsage.getState().setConsent('denied');
    usage.track('project.create');
    expect(usage.pendingUsageEvents()).toHaveLength(0);
  });

  it('queues after consent and empties the queue when consent is withdrawn', () => {
    usage.useUsage.getState().setConsent('granted');
    usage.track('document.print', { kind: 'rapport' });
    expect(usage.pendingUsageEvents()).toMatchObject([{ name: 'document.print', props: { kind: 'rapport' } }]);
    usage.useUsage.getState().setConsent('denied');
    expect(usage.pendingUsageEvents()).toHaveLength(0);
  });

  it('sends the queue in batches with the installation context, then clears it', async () => {
    const api = new RecordingApi(memoryStorage());
    usage.setUsageApiForTests(api);
    usage.useUsage.getState().setConsent('granted');
    for (let index = 0; index < 150; index += 1) usage.track('project.create');
    await usage.flushUsage();
    expect(api.batches.map((batch) => batch.events.length)).toEqual([100, 50]);
    expect(api.batches[0]).toMatchObject({ installationId: usage.installationId(), version: expect.any(String) });
    expect(usage.pendingUsageEvents()).toHaveLength(0);
  });

  it('keeps the queue bounded', () => {
    usage.useUsage.getState().setConsent('granted');
    for (let index = 0; index < 620; index += 1) usage.track('app.start');
    expect(usage.pendingUsageEvents()).toHaveLength(500);
  });
});

describe('feedback (spec 012, FR-F3)', () => {
  it('sends a message and lists it back with the acknowledgement', async () => {
    usage.setUsageApiForTests(new SimulatedUsageApi(memoryStorage()));
    const sent = await usage.useUsage.getState().submit({ kind: 'problem', message: 'Le calcul se bloque sur un profil vide.', contact: '', diagnostics: 'KYA-SolDesign 1.2.0' });
    expect(sent).toBe(true);
    const [thread] = usage.useUsage.getState().threads;
    expect(thread).toMatchObject({ kind: 'problem', status: 'received' });
    expect(thread?.replies).toHaveLength(1);
  });

  it('only returns the threads of this installation', async () => {
    const api = new SimulatedUsageApi(memoryStorage());
    await api.sendFeedback('other', { kind: 'idea', message: 'Une autre installation', contact: '', diagnostics: null });
    await api.sendFeedback('mine', { kind: 'question', message: 'Ma question', contact: '', diagnostics: null });
    expect((await api.listFeedback('mine')).map((thread) => thread.message)).toEqual(['Ma question']);
  });
});
