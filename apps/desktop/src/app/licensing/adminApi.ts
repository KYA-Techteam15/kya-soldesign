import type { FeatureId, LicenseLimits } from './features.js';
import { importSignKey, signLicense, type EditionId, type LicensePayload } from './token.js';

/**
 * API de la plateforme d'administration, côté licences.
 *
 * `SimulatedAdminApi` la joue localement tant que la plateforme n'expose pas son API : mêmes
 * réponses, même jeton signé. La remplacer par `HttpAdminApi` ne change rien aux écrans.
 */
export interface EditionPlan {
  readonly edition: EditionId;
  readonly plan: string;
  /** Durée en jours. */
  readonly days: number;
}

export interface EditionDescriptor {
  readonly edition: EditionId;
  readonly features: readonly FeatureId[];
  readonly limits: LicenseLimits;
  readonly watermark: 'academic' | 'student' | null;
  readonly graceDays: number;
  readonly plans: readonly EditionPlan[];
}

export interface AdminApi {
  /** Heure du serveur : la référence contre une horloge de poste reculée. */
  now(): Promise<string>;
  catalog(): Promise<readonly EditionDescriptor[]>;
  activate(key: string, deviceId: string): Promise<{ readonly token: string } | { readonly error: 'KEY_UNKNOWN' | 'SEATS_EXHAUSTED' }>;
  refresh(licenseId: string, deviceId: string): Promise<{ readonly token: string } | { readonly error: 'LICENSE_UNKNOWN' | 'LICENSE_REVOKED' | 'DEVICE_RELEASED' }>;
  release(licenseId: string, deviceId: string): Promise<void>;
}

const ALL: readonly FeatureId[] = ['system.aio', 'sizing.optimize', 'documents.word', 'documents.pricing', 'lifecycle.issue', 'catalog.userEquipment'];

/**
 * Offre simulée (spec 012, plan D3) : ce tableau vit côté plateforme dans la version réelle.
 * Commerciale : mois, trimestre, année. Académique : année. Étudiant : jour, mois.
 */
export const SIMULATED_CATALOG: readonly EditionDescriptor[] = [
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

/**
 * Clés de démonstration de l'API simulée. Elles n'ont de valeur que dans cette simulation : la
 * plateforme réelle délivrera ses propres clés.
 */
export const DEMO_KEYS: Readonly<Record<string, { readonly edition: EditionId; readonly plan: string; readonly customer: string }>> = {
  'KYA-COM-1M-DEMO': { edition: 'commercial', plan: '1m', customer: 'Démonstration' },
  'KYA-COM-3M-DEMO': { edition: 'commercial', plan: '3m', customer: 'Démonstration' },
  'KYA-COM-12M-DEMO': { edition: 'commercial', plan: '12m', customer: 'Démonstration' },
  'KYA-ACA-12M-DEMO': { edition: 'academic', plan: '12m', customer: 'Établissement de démonstration' },
  'KYA-ETU-1J-DEMO': { edition: 'student', plan: '1d', customer: 'Étudiant de démonstration' },
  'KYA-ETU-1M-DEMO': { edition: 'student', plan: '1m', customer: 'Étudiant de démonstration' },
};

/**
 * Clé de signature de DÉMONSTRATION. Elle n'existe que pour simuler la plateforme : la clé réelle
 * reste sur le serveur, et seule sa partie publique est embarquée (`LICENSE_PUBLIC_KEY`).
 */
const DEMO_SIGNING_KEY: JsonWebKey = {
  kty: 'EC', crv: 'P-256',
  x: '9sf2MqCpqx8mAsDsay8KRJ409yg5_jQIrqOQBfs7UjM',
  y: 'ZSZW60Wd7JqFzHGkcUoqwszvzbkm2ko4l4XvOvFuff8',
  d: '3U1wWzN4DFjToX2ek1HpZjA5BqPgb0n54KcR6b6HFBk',
};

/** Clé publique de vérification embarquée. En production : celle de la plateforme réelle. */
export const LICENSE_PUBLIC_KEY: JsonWebKey = { kty: 'EC', crv: 'P-256', x: DEMO_SIGNING_KEY.x!, y: DEMO_SIGNING_KEY.y! };

interface Activation { readonly licenseId: string; readonly key: string; readonly deviceId: string; readonly startsAt: string; readonly released: boolean }

const STORE = 'ksd.admin-sim.activations';
const DAY = 86_400_000;

/** Où la simulation garde ses activations : `localStorage` dans l'application, une table en test. */
export interface ActivationStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const localActivations: ActivationStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => { localStorage.setItem(key, value); },
};

export class SimulatedAdminApi implements AdminApi {
  private signingKey: Promise<CryptoKey> | null = null;

  constructor(private readonly clock: () => number = () => Date.now(), private readonly store: ActivationStore = localActivations) {}

  private readActivations(): Activation[] {
    try { return JSON.parse(this.store.getItem(STORE) ?? '[]') as Activation[]; } catch { return []; }
  }

  private writeActivations(activations: readonly Activation[]): void {
    try { this.store.setItem(STORE, JSON.stringify(activations)); } catch { /* stockage indisponible : l'activation vaut pour la séance */ }
  }

  async now(): Promise<string> { return new Date(this.clock()).toISOString(); }
  async catalog(): Promise<readonly EditionDescriptor[]> { return SIMULATED_CATALOG; }

  async activate(key: string, deviceId: string) {
    const normalized = key.trim().toUpperCase();
    const demo = DEMO_KEYS[normalized];
    if (!demo) return { error: 'KEY_UNKNOWN' as const };
    const activations = this.readActivations();
    // Une licence par clé et par poste : réactiver sur le même poste, même après l'avoir libéré,
    // reprend la même licence et sa date de début (la période ne repart pas de zéro).
    const existing = activations.find((item) => item.key === normalized && item.deviceId === deviceId);
    const activation: Activation = existing === undefined
      ? { licenseId: `LIC-${normalized}-${deviceId.slice(0, 8)}`, key: normalized, deviceId, startsAt: new Date(this.clock()).toISOString(), released: false }
      : { ...existing, released: false };
    this.writeActivations([...activations.filter((item) => item !== existing), activation]);
    return { token: await this.issue(activation) };
  }

  async refresh(licenseId: string, deviceId: string) {
    const activation = this.readActivations().find((item) => item.licenseId === licenseId && item.deviceId === deviceId);
    if (!activation) return { error: 'LICENSE_UNKNOWN' as const };
    if (activation.released) return { error: 'DEVICE_RELEASED' as const };
    return { token: await this.issue(activation) };
  }

  async release(licenseId: string, deviceId: string): Promise<void> {
    this.writeActivations(this.readActivations().map((item) => (item.licenseId === licenseId && item.deviceId === deviceId ? { ...item, released: true } : item)));
  }

  private async issue(activation: Activation): Promise<string> {
    const demo = DEMO_KEYS[activation.key]!;
    const edition = SIMULATED_CATALOG.find((item) => item.edition === demo.edition)!;
    const plan = edition.plans.find((item) => item.plan === demo.plan)!;
    const payload: LicensePayload = {
      licenseId: activation.licenseId,
      customer: demo.customer,
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
    };
    this.signingKey ??= importSignKey(DEMO_SIGNING_KEY);
    return signLicense(payload, await this.signingKey);
  }
}
