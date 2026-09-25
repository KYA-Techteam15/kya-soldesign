import { isFeatureId, type FeatureId, type LicenseLimits } from './features.js';

/**
 * Jeton de licence : charge utile JSON signée par la plateforme d'administration (ECDSA P-256,
 * SHA-256), vérifiable hors ligne avec la seule clé publique embarquée. Personne ne peut en fabriquer
 * un sans la clé privée du serveur.
 */
export type EditionId = 'commercial' | 'academic' | 'student';

export interface LicensePayload {
  readonly licenseId: string;
  readonly customer: string;
  readonly edition: EditionId;
  /** Formule souscrite : « 1m », « 3m », « 12m », « 1d »… */
  readonly plan: string;
  readonly features: readonly FeatureId[];
  readonly limits: LicenseLimits;
  /** Filigrane imposé sur les documents (code traduit au rendu), `null` pour aucun. */
  readonly watermark: 'academic' | 'student' | null;
  readonly deviceId: string;
  readonly issuedAt: string;
  readonly startsAt: string;
  readonly expiresAt: string;
  readonly graceDays: number;
  /** Au-delà, le poste doit se reconnecter pour rafraîchir la licence. */
  readonly offlineDays: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/gu, '+').replace(/_/gu, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const ALGORITHM = { name: 'ECDSA', hash: 'SHA-256' } as const;

export async function importVerifyKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

export async function importSignKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

export async function signLicense(payload: LicensePayload, key: CryptoKey): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign(ALGORITHM, key, encoder.encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}

/** Vérifie la signature puis la forme : un jeton altéré ou incomplet est refusé. */
export async function verifyLicense(token: string, key: CryptoKey): Promise<LicensePayload | null> {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  let valid = false;
  try { valid = await crypto.subtle.verify(ALGORITHM, key, fromBase64Url(signature), encoder.encode(body)); } catch { return null; }
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as LicensePayload;
    if (!['commercial', 'academic', 'student'].includes(payload.edition) || !Array.isArray(payload.features) || !payload.features.every(isFeatureId)) return null;
    if (Number.isNaN(Date.parse(payload.expiresAt)) || Number.isNaN(Date.parse(payload.startsAt))) return null;
    return payload;
  } catch {
    return null;
  }
}
