import { describe, expect, it } from 'vitest';
import { FEATURES } from '../../src/app/licensing/features.js';
import { DEMO_KEYS, LICENSE_PUBLIC_KEY, SIMULATED_CATALOG, SimulatedAdminApi } from '../../src/app/licensing/adminApi.js';
import { evaluateLicense, isEntitled, LicenseService, memoryStore, type LicenseView } from '../../src/app/licensing/licenseService.js';
import type { LicensePayload } from '../../src/app/licensing/token.js';
import { dueAlert, licenseTone } from '../../src/shell/LicenseBadge.js';

const DAY = 86_400_000;
const T0 = Date.parse('2026-09-25T09:00:00.000Z');

/** Un poste simulé : horloge réglable, stockage du poste et de la plateforme séparés. */
function station(autoDemoKey: string | null = null) {
  let now = T0;
  const clock = () => now;
  const api = new SimulatedAdminApi(clock, memoryStore());
  const service = new LicenseService(api, LICENSE_PUBLIC_KEY, memoryStore(), clock, autoDemoKey);
  return { service, api, setNow: (value: number) => { now = value; } };
}

function view(result: LicenseView | { readonly error: string }): LicenseView {
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('licence editions (spec 012, plan D3)', () => {
  it('opens exactly the features of each edition', async () => {
    const expected: Record<string, readonly string[]> = {
      'KYA-COM-12M-DEMO': FEATURES,
      'KYA-ACA-12M-DEMO': FEATURES.filter((feature) => feature !== 'documents.pricing'),
      'KYA-ETU-1M-DEMO': ['system.aio'],
    };
    for (const [key, features] of Object.entries(expected)) {
      const { service } = station();
      const license = view(await service.activate(key));
      expect(license.status).toBe('active');
      for (const feature of FEATURES) expect(isEntitled(license, feature), `${key} · ${feature}`).toBe(features.includes(feature));
    }
  });

  it('offers month, quarter and year (commercial), year (academic), day and month (student)', () => {
    const plans = Object.fromEntries(SIMULATED_CATALOG.map((edition) => [edition.edition, edition.plans.map((plan) => plan.plan)]));
    expect(plans).toEqual({ commercial: ['1m', '3m', '12m'], academic: ['12m'], student: ['1d', '1m'] });
  });

  it('carries the watermark code and the project limit of the edition', async () => {
    const student = view(await station().service.activate('KYA-ETU-1J-DEMO'));
    expect(student.payload?.watermark).toBe('student');
    expect(student.limits.maxProjects).toBe(5);
    expect(student.remainingDays).toBe(1);
    const commercial = view(await station().service.activate('KYA-COM-3M-DEMO'));
    expect(commercial.payload?.watermark).toBeNull();
    expect(commercial.remainingDays).toBe(91);
  });

  it('refuses an unknown key', async () => {
    expect(await station().service.activate('KYA-FAKE')).toEqual({ error: 'KEY_UNKNOWN' });
  });

  it('every demo key maps to a plan of the catalogue', () => {
    for (const demo of Object.values(DEMO_KEYS)) {
      expect(SIMULATED_CATALOG.find((edition) => edition.edition === demo.edition)?.plans.some((plan) => plan.plan === demo.plan)).toBe(true);
    }
  });
});

describe('licence over time', () => {
  it('counts the days left, then grace, then read-only', async () => {
    const { service, setNow } = station();
    await service.activate('KYA-COM-1M-DEMO');
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
    const { service, setNow } = station();
    await service.activate('KYA-ETU-1J-DEMO');
    setNow(T0 + DAY + 60_000);
    expect((await service.load()).status).toBe('expired');
  });

  it('goes read-only when the clock is set back, and recovers once it is right', async () => {
    const { service, setNow } = station();
    await service.activate('KYA-COM-12M-DEMO');
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
    const { service, setNow } = station();
    await service.activate('KYA-COM-12M-DEMO');
    setNow(T0 + 31 * DAY);
    expect((await service.load()).status).toBe('offline');
    expect((await service.refresh() as LicenseView).status).toBe('active');
  });

  it('keeps the start date when a released key is activated again', async () => {
    const { service, setNow } = station();
    await service.activate('KYA-COM-1M-DEMO');
    const released = await service.release();
    expect(released.status).toBe('none');
    expect(released.readOnly).toBe(true);
    setNow(T0 + 10 * DAY);
    expect(view(await service.activate('KYA-COM-1M-DEMO')).remainingDays).toBe(20);
  });
});

describe('licence integrity', () => {
  it('delivers the demo licence on first launch only', async () => {
    const { service } = station('KYA-COM-12M-DEMO');
    const first = await service.load();
    expect(first.payload?.edition).toBe('commercial');
    await service.release();
    expect((await service.load()).status).toBe('none');
  });

  it('rejects a token whose payload was altered', async () => {
    const store = memoryStore();
    const api = new SimulatedAdminApi(() => T0, memoryStore());
    const service = new LicenseService(api, LICENSE_PUBLIC_KEY, store, () => T0);
    await service.activate('KYA-ETU-1M-DEMO');
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
    const { service, setNow } = station();
    await service.activate(key);
    setNow(T0 + days * DAY);
    return service.load();
  };

  it('colours the badge as the end approaches', async () => {
    expect(licenseTone(await at('KYA-COM-12M-DEMO', 0))).toBe('ok');
    expect(licenseTone(await at('KYA-COM-1M-DEMO', 5))).toBe('soon');
    expect(licenseTone(await at('KYA-COM-1M-DEMO', 25))).toBe('urgent');
    expect(licenseTone(null)).toBe('off');
  });

  it('raises each threshold once per licence', async () => {
    const license = await at('KYA-COM-1M-DEMO', 24);
    expect(dueAlert(license, null)).toBe(7);
    const mark = `${license.payload!.licenseId}:${license.payload!.expiresAt}:7`;
    expect(dueAlert(license, mark)).toBeNull();
    expect(dueAlert(await at('KYA-COM-12M-DEMO', 0), null)).toBeNull();
  });
});
