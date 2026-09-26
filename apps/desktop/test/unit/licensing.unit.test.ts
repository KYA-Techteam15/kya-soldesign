import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../src/app/licensing/features.js';
import { HttpAdminApi } from '../../src/app/licensing/httpAdminApi.js';
import { editionLabel, planLabel, watermarkLabel } from '../../src/app/licensing/labels.js';
import { LICENSE_PUBLIC_KEY, PLATFORMS } from '../../src/app/licensing/platform.js';
import { translate } from '../../src/i18n/index.js';
import { FakePlatform, TEST_CATALOG, TEST_KEYS } from '../support/fakePlatform.js';
import { evaluateLicense, isEntitled, LicenseService, memoryStore, type LicenseView } from '../../src/app/licensing/licenseService.js';
import type { LicensePayload } from '../../src/app/licensing/token.js';
import { dueAlert, licenseTone } from '../../src/shell/LicenseBadge.js';

const DAY = 86_400_000;
const T0 = Date.parse('2026-09-25T09:00:00.000Z');

/** Un poste face à une fausse plateforme : horloge réglable, clé de test tirée à chaque fois. */
async function station() {
  let now = T0;
  const clock = () => now;
  const api = await FakePlatform.create(clock);
  const service = new LicenseService(api, api.publicKey, memoryStore(), clock);
  return { service, api, setNow: (value: number) => { now = value; } };
}

function view(result: LicenseView | { readonly error: string }): LicenseView {
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('licence editions (spec 012, plan D3)', () => {
  it('opens exactly the features of each edition', async () => {
    const expected: Record<string, readonly string[]> = {
      'KYA-COM-12M-TEST': FEATURES,
      'KYA-ACA-12M-TEST': FEATURES.filter((feature) => feature !== 'documents.pricing'),
      'KYA-ETU-1M-TEST': ['system.aio'],
    };
    for (const [key, features] of Object.entries(expected)) {
      const { service } = (await station());
      const license = view(await service.activate(key));
      expect(license.status).toBe('active');
      for (const feature of FEATURES) expect(isEntitled(license, feature), `${key} · ${feature}`).toBe(features.includes(feature));
    }
  });

  it('offers month, quarter and year (commercial), year (academic), day and month (student)', () => {
    const plans = Object.fromEntries(TEST_CATALOG.map((edition) => [edition.edition, edition.plans.map((plan) => plan.plan)]));
    expect(plans).toEqual({ commercial: ['1m', '3m', '12m'], academic: ['12m'], student: ['1d', '1m'] });
  });

  it('carries the watermark code and the project limit of the edition', async () => {
    const student = view(await (await station()).service.activate('KYA-ETU-1D-TEST'));
    expect(student.payload?.watermark).toBe('student');
    expect(student.limits.maxProjects).toBe(5);
    expect(student.remainingDays).toBe(1);
    const commercial = view(await (await station()).service.activate('KYA-COM-3M-TEST'));
    expect(commercial.payload?.watermark).toBeNull();
    expect(commercial.remainingDays).toBe(91);
  });

  it('refuses an unknown key', async () => {
    expect(await (await station()).service.activate('KYA-FAKE')).toEqual({ error: 'KEY_UNKNOWN' });
  });

  it('every test key maps to a plan of the catalogue', () => {
    for (const demo of Object.values(TEST_KEYS)) {
      expect(TEST_CATALOG.find((edition) => edition.edition === demo.edition)?.plans.some((plan) => plan.plan === demo.plan)).toBe(true);
    }
  });
});

describe('licence over time', () => {
  it('counts the days left, then grace, then read-only', async () => {
    const { service, setNow } = await station();
    await service.activate('KYA-COM-1M-TEST');
    setNow(T0 + 10 * DAY);
    expect((await service.load()).remainingDays).toBe(20);
    // Un passage en ligne : un renouvellement non payé ne change pas l'échéance.
    setNow(T0 + 20 * DAY);
    expect(view(await service.refresh()).remainingDays).toBe(10);
    setNow(T0 + 32 * DAY);
    const grace = await service.load();
    expect(grace.status).toBe('grace');
    expect(grace.readOnly).toBe(false);
    expect(grace.graceUntil).toBe(new Date(T0 + 37 * DAY).toISOString());
    setNow(T0 + 38 * DAY);
    const expired = await service.load();
    expect(expired.status).toBe('expired');
    expect(expired.readOnly).toBe(true);
    expect(isEntitled(expired, 'system.aio')).toBe(false);
  });

  it('has no grace for the student edition', async () => {
    const { service, setNow } = await station();
    await service.activate('KYA-ETU-1D-TEST');
    setNow(T0 + DAY + 60_000);
    expect((await service.load()).status).toBe('expired');
  });

  it('goes read-only when the clock is set back, and recovers once it is right', async () => {
    const { service, setNow } = await station();
    await service.activate('KYA-COM-12M-TEST');
    setNow(T0 + 5 * DAY);
    await service.load();
    setNow(T0 + 2 * DAY);
    const rolledBack = await service.load();
    expect(rolledBack.status).toBe('clock');
    expect(rolledBack.readOnly).toBe(true);
    setNow(T0 + 5 * DAY + 60_000);
    expect((await service.load()).status).toBe('active');
  });

  it('asks for an online check after the offline tolerance', async () => {
    const { service, setNow } = await station();
    await service.activate('KYA-COM-12M-TEST');
    setNow(T0 + 31 * DAY);
    expect((await service.load()).status).toBe('offline');
    expect((await service.refresh() as LicenseView).status).toBe('active');
  });

  it('keeps the start date when a released key is activated again', async () => {
    const { service, setNow } = await station();
    await service.activate('KYA-COM-1M-TEST');
    const released = await service.release();
    expect(released.status).toBe('none');
    expect(released.readOnly).toBe(true);
    setNow(T0 + 10 * DAY);
    expect(view(await service.activate('KYA-COM-1M-TEST')).remainingDays).toBe(20);
  });
});

describe('licence integrity', () => {
  it('starts without any licence, read-only, until a key is activated (T061)', async () => {
    const { service } = await station();
    expect((await service.load()).status).toBe('none');
    expect(view(await service.activate('KYA-COM-12M-TEST')).status).toBe('active');
  });

  it('rejects a token whose payload was altered', async () => {
    const store = memoryStore();
    const api = await FakePlatform.create(() => T0);
    const service = new LicenseService(api, api.publicKey, store, () => T0);
    await service.activate('KYA-ETU-1M-TEST');
    const [body, signature] = store.getItem('ksd.license.token')!.split('.');
    const payload = JSON.parse(Buffer.from(body!, 'base64url').toString()) as LicensePayload;
    const forged = Buffer.from(JSON.stringify({ ...payload, edition: 'commercial', features: [...FEATURES] })).toString('base64url');
    store.setItem('ksd.license.token', `${forged}.${signature!}`);
    const result = await service.load();
    expect(result.status).toBe('invalid');
    expect(result.readOnly).toBe(true);
  });

  it('is read-only without any licence', () => {
    expect(evaluateLicense(null, T0, null, null)).toMatchObject({ status: 'none', readOnly: true });
  });
});

describe('licence badge and alerts', () => {
  const at = async (key: string, days: number) => {
    const { service, setNow } = await station();
    await service.activate(key);
    setNow(T0 + days * DAY);
    return service.load();
  };

  it('colours the badge as the end approaches', async () => {
    expect(licenseTone(await at('KYA-COM-12M-TEST', 0))).toBe('ok');
    expect(licenseTone(await at('KYA-COM-1M-TEST', 5))).toBe('soon');
    expect(licenseTone(await at('KYA-COM-1M-TEST', 25))).toBe('urgent');
    expect(licenseTone(null)).toBe('off');
  });

  it('raises each threshold once per licence', async () => {
    const license = await at('KYA-COM-1M-TEST', 24);
    expect(dueAlert(license, null)).toBe(7);
    const mark = `${license.payload!.licenseId}:${license.payload!.expiresAt}:7`;
    expect(dueAlert(license, mark)).toBeNull();
    expect(dueAlert(await at('KYA-COM-12M-TEST', 0), null)).toBeNull();
  });
});

describe('platform licences (T061)', () => {
  const payload = (overrides: Record<string, unknown> = {}) => ({
    licenseId: 'lic_futur',
    customer: 'Bureau d’études',
    edition: 'commercial',
    plan: '14d',
    features: ['system.aio', 'sizing.optimize'],
    limits: { maxProjects: null, seats: 1 },
    watermark: null,
    deviceId: 'poste-1',
    issuedAt: new Date(T0).toISOString(),
    startsAt: new Date(T0).toISOString(),
    expiresAt: new Date(T0 + 14 * DAY).toISOString(),
    graceDays: 7,
    offlineDays: 30,
    ...overrides,
  });

  it('embeds only public keys, and the production key is the platform one', () => {
    for (const platform of Object.values(PLATFORMS)) expect(platform.publicKey).not.toHaveProperty('d');
    expect(PLATFORMS.production.publicKey.x).toBe('gIrGNfod9yXlmdGlpKCKV0tEtYSI3i3Y3j-IX6QrQgY');
    expect(LICENSE_PUBLIC_KEY).not.toHaveProperty('d');
  });

  it('ignores a feature it does not know instead of refusing the token', async () => {
    const api = await FakePlatform.create(() => T0);
    const store = memoryStore();
    store.setItem('ksd.license.token', await api.sign(payload({ features: ['system.aio', 'future.feature'] })));
    const license = await new LicenseService(api, api.publicKey, store, () => T0).load();
    expect(license.status).toBe('active');
    expect([...license.features]).toEqual(['system.aio']);
  });

  it('opens an unknown edition read-only and asks for an update', async () => {
    const api = await FakePlatform.create(() => T0);
    const store = memoryStore();
    store.setItem('ksd.license.token', await api.sign(payload({ edition: 'partner', watermark: 'partner' })));
    const license = await new LicenseService(api, api.publicKey, store, () => T0).load();
    expect(license).toMatchObject({ status: 'outdated', readOnly: true });
    const t = (key: string) => translate(key, 'fr');
    expect(editionLabel(t, 'partner')).toBe('partner');
    expect(watermarkLabel(t, 'partner')).toBe('Licence restreinte');
  });

  it('names any duration: known plans, then days', () => {
    const t = (key: string) => translate(key, 'fr');
    expect(planLabel(t, '12m')).toBe('1 an');
    expect(planLabel(t, '14d')).toBe('14 jours');
    expect(planLabel(t, '1d')).toBe('1 jour');
    expect(editionLabel(t, 'commercial')).toBe('Commerciale');
  });

  it('speaks the platform contract over HTTP', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const responses: Record<string, [number, unknown]> = {
      '/api/software/v1/time': [200, { now: '2026-09-25T09:00:00.000Z' }],
      '/api/software/v1/licenses/activate': [404, { error: 'KEY_UNKNOWN' }],
      '/api/software/v1/licenses/lic_1/refresh': [409, { error: 'DEVICE_RELEASED' }],
      '/api/software/v1/licenses/lic_1/release': [204, null],
    };
    const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      calls.push({ url: url.pathname, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null });
      const [status, body] = responses[url.pathname] ?? [500, null];
      return new Response(body === null ? null : JSON.stringify(body), { status });
    }) as typeof fetch;
    const api = new HttpAdminApi('https://plateforme.test', 'PC-BUREAU', fetcher);
    expect(await api.now()).toBe('2026-09-25T09:00:00.000Z');
    expect(await api.activate('KYA-XXX', 'poste-1')).toEqual({ error: 'KEY_UNKNOWN' });
    expect(calls[1]).toEqual({ url: '/api/software/v1/licenses/activate', body: { key: 'KYA-XXX', deviceId: 'poste-1', deviceName: 'PC-BUREAU' } });
    expect(await api.refresh('lic_1', 'poste-1')).toEqual({ error: 'DEVICE_RELEASED' });
    await expect(api.release('lic_1', 'poste-1')).resolves.toBeUndefined();
    await expect(api.catalog()).rejects.toThrow('statut 500');
    await expect(new HttpAdminApi('', null, fetcher).now()).rejects.toThrow('non configurée');
  });
});
