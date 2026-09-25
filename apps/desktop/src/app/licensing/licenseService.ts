import type { AdminApi } from './adminApi.js';
import type { FeatureId, LicenseLimits } from './features.js';
import { importVerifyKey, verifyLicense, type LicensePayload } from './token.js';

/**
 * État de la licence du poste (spec 012, FR-D2 → FR-D6).
 *
 * - `active` : dans la période payée ; `grace` : échue, délai de grâce en cours ;
 * - `expired` : au-delà de la grâce ; `offline` : trop longtemps sans vérification en ligne ;
 * - `clock` : l'horloge du poste a reculé sous la dernière date vue ;
 * - `none` : aucune licence active sur ce poste ; `invalid` : jeton refusé.
 *
 * Sauf `active` et `grace`, le logiciel passe en lecture seule (P-7) : les projets restent
 * ouverts, consultables et exportables, rien ne se calcule ni ne s'émet.
 */
export type LicenseStatus = 'none' | 'active' | 'grace' | 'expired' | 'offline' | 'clock' | 'invalid';

export interface LicenseView {
  readonly status: LicenseStatus;
  readonly payload: LicensePayload | null;
  /** Jours restants dans la période payée (0 le dernier jour), `null` sans licence. */
  readonly remainingDays: number | null;
  /** Fin du délai de grâce, pour une licence échue. */
  readonly graceUntil: string | null;
  readonly readOnly: boolean;
  readonly features: ReadonlySet<FeatureId>;
  readonly limits: LicenseLimits;
  readonly lastVerifiedAt: string | null;
}

const DAY = 86_400_000;
/** Recul d'horloge toléré (changement d'heure, synchronisation). */
const CLOCK_TOLERANCE = 3_600_000;
const NO_LIMITS: LicenseLimits = { maxProjects: null, seats: 0 };

export function evaluateLicense(payload: LicensePayload | null, nowMs: number, lastSeenMs: number | null, lastVerifiedMs: number | null): LicenseView {
  if (payload === null) return { status: 'none', payload: null, remainingDays: null, graceUntil: null, readOnly: true, features: new Set(), limits: NO_LIMITS, lastVerifiedAt: null };
  const expires = Date.parse(payload.expiresAt);
  const graceEnd = expires + payload.graceDays * DAY;
  const base = {
    payload,
    remainingDays: Math.max(0, Math.ceil((expires - nowMs) / DAY)),
    graceUntil: nowMs > expires ? new Date(graceEnd).toISOString() : null,
    features: new Set(payload.features),
    limits: payload.limits,
    lastVerifiedAt: lastVerifiedMs === null ? null : new Date(lastVerifiedMs).toISOString(),
  };
  // Ordre des motifs : le plus utile à l'utilisateur d'abord (une licence échue se renouvelle,
  // inutile de lui demander d'abord de se reconnecter).
  if (lastSeenMs !== null && nowMs < lastSeenMs - CLOCK_TOLERANCE) return { ...base, status: 'clock', readOnly: true };
  if (nowMs > graceEnd) return { ...base, status: 'expired', readOnly: true };
  if (lastVerifiedMs !== null && nowMs - lastVerifiedMs > payload.offlineDays * DAY) return { ...base, status: 'offline', readOnly: true };
  if (nowMs <= expires) return { ...base, status: 'active', readOnly: false };
  return { ...base, status: 'grace', readOnly: false };
}

/** Une fonction est accessible si la licence la contient et n'est pas en lecture seule. */
export function isEntitled(view: LicenseView, feature: FeatureId): boolean {
  return !view.readOnly && view.features.has(feature);
}

/** Petit stockage clé-valeur : `localStorage` dans l'application, une table en mémoire en test. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEYS = { token: 'ksd.license.token', verified: 'ksd.license.verified', seen: 'ksd.license.seen', device: 'ksd.device-id', released: 'ksd.license.released' } as const;

export class LicenseService {
  private verifyKey: Promise<CryptoKey>;

  constructor(
    private readonly api: AdminApi,
    publicKey: JsonWebKey,
    private readonly store: KeyValueStore,
    private readonly clock: () => number = () => Date.now(),
    /** Simulation seulement : licence de démonstration délivrée au premier lancement. */
    private readonly autoDemoKey: string | null = null,
  ) {
    this.verifyKey = importVerifyKey(publicKey);
  }

  /** Identifiant stable du poste, tiré au premier lancement. */
  deviceId(): string {
    const known = this.store.getItem(KEYS.device);
    if (known) return known;
    const created = crypto.randomUUID();
    this.store.setItem(KEYS.device, created);
    return created;
  }

  /** Lit la licence enregistrée et calcule son état ; mémorise la date vue (contre le recul d'horloge). */
  async load(): Promise<LicenseView> {
    if (!this.store.getItem(KEYS.token) && this.autoDemoKey && !this.store.getItem(KEYS.released)) {
      await this.activate(this.autoDemoKey);
    }
    return this.evaluate();
  }

  async activate(key: string): Promise<LicenseView | { readonly error: string }> {
    const result = await this.api.activate(key, this.deviceId());
    if ('error' in result) return result;
    return this.accept(result.token);
  }

  /** Rafraîchit auprès de la plateforme : renouvellement, changement d'édition, révocation. */
  async refresh(): Promise<LicenseView | { readonly error: string }> {
    const current = await this.current();
    if (current === null) return this.evaluate();
    const result = await this.api.refresh(current.licenseId, this.deviceId());
    if ('error' in result) {
      if (result.error === 'DEVICE_RELEASED' || result.error === 'LICENSE_REVOKED') {
        this.store.removeItem(KEYS.token);
        this.store.setItem(KEYS.released, '1');
      }
      return result;
    }
    return this.accept(result.token);
  }

  /** Libère ce poste : la licence peut être activée ailleurs ; ce poste passe en lecture seule. */
  async release(): Promise<LicenseView> {
    const current = await this.current();
    if (current !== null) await this.api.release(current.licenseId, this.deviceId());
    this.store.removeItem(KEYS.token);
    this.store.setItem(KEYS.released, '1');
    return this.evaluate();
  }

  private async accept(token: string): Promise<LicenseView> {
    const payload = await verifyLicense(token, await this.verifyKey);
    if (payload === null) return { ...evaluateLicense(null, this.clock(), null, null), status: 'invalid' };
    const serverNow = Date.parse(await this.api.now());
    this.store.setItem(KEYS.token, token);
    this.store.setItem(KEYS.verified, String(serverNow));
    this.store.setItem(KEYS.seen, String(serverNow));
    this.store.removeItem(KEYS.released);
    return this.evaluate();
  }

  private async current(): Promise<LicensePayload | null> {
    const token = this.store.getItem(KEYS.token);
    return token ? verifyLicense(token, await this.verifyKey) : null;
  }

  private async evaluate(): Promise<LicenseView> {
    const token = this.store.getItem(KEYS.token);
    const payload = token ? await verifyLicense(token, await this.verifyKey) : null;
    if (token && payload === null) return { ...evaluateLicense(null, this.clock(), null, null), status: 'invalid' };
    const now = this.clock();
    const seen = Number(this.store.getItem(KEYS.seen)) || null;
    const verified = Number(this.store.getItem(KEYS.verified)) || null;
    const view = evaluateLicense(payload, now, seen, verified);
    if (view.status !== 'clock') this.store.setItem(KEYS.seen, String(Math.max(now, seen ?? 0)));
    return view;
  }
}

/** Stockage en mémoire, pour les tests et quand `localStorage` est indisponible. */
export function memoryStore(): KeyValueStore {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
}
