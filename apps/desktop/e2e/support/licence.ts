import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';
import { FakePlatform } from '../../test/support/fakePlatform';

/**
 * Licences des parcours (spec 012, T061). La version construite pour les tests embarque la clé
 * publique de test (`VITE_LICENSE_PUBLIC_KEY`) et vise une plateforme fictive
 * (`VITE_PLATFORM_URL`) : les parcours y préinstallent une licence commerciale, et ceux des
 * licences interceptent les appels vers cette fausse plateforme.
 */
export const TEST_PLATFORM_URL = 'https://plateforme.test';

const keyFile = new URL('./test-signing-key.json', import.meta.url);
export const TEST_SIGNING_KEY = JSON.parse(readFileSync(keyFile, 'utf8')) as JsonWebKey;
export const TEST_PUBLIC_KEY = JSON.stringify({ kty: 'EC', crv: 'P-256', x: TEST_SIGNING_KEY.x, y: TEST_SIGNING_KEY.y });
export const TEST_DEVICE_ID = 'poste-des-parcours';

const DAY = 86_400_000;

/** Stockage du poste pour une licence commerciale d'un an, vérifiée à l'instant. */
export async function commercialLicenceStorage(now = Date.now()): Promise<{ name: string; value: string }[]> {
  const platform = await FakePlatform.create(() => now, TEST_SIGNING_KEY);
  const token = await platform.sign({
    licenseId: 'lic_parcours',
    customer: 'Bureau d’études de test',
    edition: 'commercial',
    plan: '12m',
    features: ['system.aio', 'sizing.optimize', 'documents.word', 'documents.pricing', 'lifecycle.issue', 'catalog.userEquipment'],
    limits: { maxProjects: null, seats: 1 },
    watermark: null,
    deviceId: TEST_DEVICE_ID,
    issuedAt: new Date(now).toISOString(),
    startsAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 365 * DAY).toISOString(),
    graceDays: 7,
    offlineDays: 30,
  });
  return [
    { name: 'ksd.device-id', value: TEST_DEVICE_ID },
    { name: 'ksd.license.token', value: token },
    { name: 'ksd.license.verified', value: String(now) },
    { name: 'ksd.license.seen', value: String(now) },
  ];
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept',
};

/** Branche la page sur une fausse plateforme (mêmes routes et codes que `/api/software/v1`). */
export async function useFakePlatform(page: Page): Promise<FakePlatform> {
  const platform = await FakePlatform.create(() => Date.now(), TEST_SIGNING_KEY);
  await page.route(`${TEST_PLATFORM_URL}/api/software/v1/**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const path = new URL(request.url()).pathname.replace('/api/software/v1', '');
    const body = (request.postDataJSON() ?? {}) as { key?: string; deviceId?: string };
    const reply = (status: number, json: unknown) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(json) });
    if (path === '/time') return reply(200, { now: await platform.now() });
    if (path === '/licenses/activate') {
      const result = await platform.activate(body.key ?? '', body.deviceId ?? '');
      return 'error' in result ? reply(result.error === 'KEY_UNKNOWN' ? 404 : 409, result) : reply(200, result);
    }
    const refresh = /^\/licenses\/([^/]+)\/refresh$/u.exec(path);
    if (refresh) {
      const result = await platform.refresh(decodeURIComponent(refresh[1]!), body.deviceId ?? '');
      return 'error' in result ? reply(result.error === 'LICENSE_UNKNOWN' ? 404 : 409, result) : reply(200, result);
    }
    const release = /^\/licenses\/([^/]+)\/release$/u.exec(path);
    if (release) {
      await platform.release(decodeURIComponent(release[1]!), body.deviceId ?? '');
      return route.fulfill({ status: 204, headers: CORS });
    }
    return reply(404, { error: 'NOT_FOUND' });
  });
  return platform;
}
