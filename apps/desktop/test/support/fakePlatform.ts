import type { AdminApi, EditionDescriptor } from '../../src/app/licensing/adminApi.js';
import { FEATURES, type FeatureId } from '../../src/app/licensing/features.js';
import { importSignKey, signLicense, type LicensePayload } from '../../src/app/licensing/token.js';

/**
 * Fausse plateforme KYA-EnergyMarket, pour les tests uniquement (spec 012, T061). Elle signe avec
 * une clé de test : jamais embarquée dans le logiciel livré, qui ne connaît que les clés publiques
 * de la plateforme réelle. Mêmes réponses que `/api/software/v1`.
 */
const ALL: readonly FeatureId[] = FEATURES;
const DAY = 86_400_000;

export const TEST_CATALOG: readonly EditionDescriptor[] = [
  {
    edition: 'commercial',
    features: ALL,
    limits: { maxProjects: null, seats: 1 },
    watermark: null,
    graceDays: 7,
    plans: [{ edition: 'commercial', plan: '1m', days: 30 }, { edition: 'commercial', plan: '3m', days: 91 }, { edition: 'commercial', plan: '12m', days: 365 }],
  },
  {
    edition: 'academic',
    features: ALL.filter((feature) => feature !== 'documents.pricing'),
    limits: { maxProjects: null, seats: 1 },
    watermark: 'academic',
    graceDays: 3,
    plans: [{ edition: 'academic', plan: '12m', days: 365 }],
  },
  {
    edition: 'student',
    features: ['system.aio'],
    limits: { maxProjects: 5, seats: 1 },
    watermark: 'student',
    graceDays: 0,
    plans: [{ edition: 'student', plan: '1d', days: 1 }, { edition: 'student', plan: '1m', days: 30 }],
  },
];

export const TEST_KEYS: Readonly<Record<string, { readonly edition: string; readonly plan: string; readonly customer: string }>> = {
  'KYA-COM-1M-TEST': { edition: 'commercial', plan: '1m', customer: 'Bureau d’études de test' },
  'KYA-COM-3M-TEST': { edition: 'commercial', plan: '3m', customer: 'Bureau d’études de test' },
  'KYA-COM-12M-TEST': { edition: 'commercial', plan: '12m', customer: 'Bureau d’études de test' },
  'KYA-ACA-12M-TEST': { edition: 'academic', plan: '12m', customer: 'Établissement de test' },
  'KYA-ETU-1D-TEST': { edition: 'student', plan: '1d', customer: 'Étudiant de test' },
  'KYA-ETU-1M-TEST': { edition: 'student', plan: '1m', customer: 'Étudiant de test' },
};

interface Activation { readonly licenseId: string; readonly key: string; readonly deviceId: string; readonly startsAt: string; readonly released: boolean }

export class FakePlatform implements AdminApi {
  private activations: Activation[] = [];

  private constructor(
    private readonly signingKey: CryptoKey,
    readonly publicKey: JsonWebKey,
    private readonly clock: () => number,
  ) {}

  /** Clé fournie (tests de parcours, clé publique connue du logiciel construit) ou tirée au hasard. */
  static async create(clock: () => number = () => Date.now(), privateJwk?: JsonWebKey): Promise<FakePlatform> {
    let jwk = privateJwk;
    if (!jwk) {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    }
    const publicKey: JsonWebKey = { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
    return new FakePlatform(await importSignKey({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d }), publicKey, clock);
  }

  async now(): Promise<string> { return new Date(this.clock()).toISOString(); }
  async catalog(): Promise<readonly EditionDescriptor[]> { return TEST_CATALOG; }

  async activate(key: string, deviceId: string) {
    const normalized = key.trim().toUpperCase();
    if (!TEST_KEYS[normalized]) return { error: 'KEY_UNKNOWN' as const };
    const existing = this.activations.find((item) => item.key === normalized && item.deviceId === deviceId);
    const activation: Activation = existing === undefined
      ? { licenseId: `lic_${normalized.toLowerCase().replace(/-/gu, '')}${deviceId.slice(0, 4)}`, key: normalized, deviceId, startsAt: new Date(this.clock()).toISOString(), released: false }
      : { ...existing, released: false };
    this.activations = [...this.activations.filter((item) => item !== existing), activation];
    return { token: await this.issue(activation) };
  }

  async refresh(licenseId: string, deviceId: string) {
    const activation = this.activations.find((item) => item.licenseId === licenseId && item.deviceId === deviceId);
    if (!activation) return { error: 'LICENSE_UNKNOWN' as const };
    if (activation.released) return { error: 'DEVICE_RELEASED' as const };
    return { token: await this.issue(activation) };
  }

  async release(licenseId: string, deviceId: string): Promise<void> {
    this.activations = this.activations.map((item) => (item.licenseId === licenseId && item.deviceId === deviceId ? { ...item, released: true } : item));
  }

  /** Signe une charge utile quelconque (jetons d'une plateforme plus récente que le logiciel). */
  async sign(payload: LicensePayload | Record<string, unknown>): Promise<string> {
    return signLicense(payload as LicensePayload, this.signingKey);
  }

  private async issue(activation: Activation): Promise<string> {
    const offer = TEST_KEYS[activation.key]!;
    const edition = TEST_CATALOG.find((item) => item.edition === offer.edition)!;
    const plan = edition.plans.find((item) => item.plan === offer.plan)!;
    return this.sign({
      licenseId: activation.licenseId,
      customer: offer.customer,
      edition: edition.edition,
      plan: plan.plan,
      features: edition.features,
      limits: edition.limits,
      watermark: edition.watermark,
      deviceId: activation.deviceId,
      issuedAt: new Date(this.clock()).toISOString(),
      startsAt: activation.startsAt,
      expiresAt: new Date(Date.parse(activation.startsAt) + plan.days * DAY).toISOString(),
      graceDays: edition.graceDays,
      offlineDays: 30,
    });
  }
}
