/**
 * Plateforme KYA-EnergyMarket qui délivre et vérifie les licences (spec 012, T061).
 *
 * Chaque environnement a son adresse et sa clé publique ; le logiciel n'embarque que des clés
 * publiques : il vérifie les jetons, il ne peut pas en fabriquer. L'environnement se choisit à la
 * construction (`VITE_PLATFORM_ENV`) ; `VITE_PLATFORM_URL` et `VITE_LICENSE_PUBLIC_KEY` ne servent
 * qu'aux tests, qui jouent une fausse plateforme.
 */
export type PlatformEnvironment = 'dev' | 'production';

interface PlatformDefinition {
  /** Adresse de la plateforme ; vide tant que le domaine de production n'est pas ouvert. */
  readonly url: string;
  /** Clé publique ECDSA P-256 des jetons de cet environnement (docs/operations/cles-licences.md). */
  readonly publicKey: JsonWebKey;
}

export const PLATFORMS: Readonly<Record<PlatformEnvironment, PlatformDefinition>> = {
  dev: {
    url: 'https://kya-energy-market-dev.13.140.178.49.sslip.io',
    publicKey: {
      kty: 'EC',
      crv: 'P-256',
      x: 'cst-1KzBdetUvapHCFwAIl-dw4SEEa_Y_MWnTMuSv-0',
      y: 'wHtqcCpjW5MxeYJE5VKRmcMSTY5IZl1GmD0g3vl7y3M',
    },
  },
  production: {
    // Domaine de production : fixé à la mise en production de la plateforme (spécification 011).
    url: '',
    publicKey: {
      kty: 'EC',
      crv: 'P-256',
      x: 'gIrGNfod9yXlmdGlpKCKV0tEtYSI3i3Y3j-IX6QrQgY',
      y: 'cDFjZR6VXtuCzoeShSJ-XjuDPCWNE3-KxyswVa4mtrU',
    },
  },
};

const env = import.meta.env as Record<string, string | undefined>;

/** Environnement de la construction : `dev` tant que la plateforme de production n'est pas ouverte. */
export const platformEnvironment: PlatformEnvironment = env.VITE_PLATFORM_ENV === 'production' ? 'production' : 'dev';

function publicKeyOverride(): JsonWebKey | null {
  const raw = env.VITE_LICENSE_PUBLIC_KEY?.trim();
  if (!raw) return null;
  try {
    const key = JSON.parse(raw) as JsonWebKey;
    return key.kty === 'EC' && key.crv === 'P-256' && !('d' in key) ? { kty: key.kty, crv: key.crv, x: key.x, y: key.y } : null;
  } catch {
    return null;
  }
}

/** Adresse de la plateforme, sans barre finale. */
export const platformUrl = (env.VITE_PLATFORM_URL?.trim() || PLATFORMS[platformEnvironment].url).replace(/\/+$/u, '');

/** Clé publique qui vérifie les jetons de licence. */
export const LICENSE_PUBLIC_KEY: JsonWebKey = publicKeyOverride() ?? PLATFORMS[platformEnvironment].publicKey;

/** Pages de la plateforme ouvertes depuis le logiciel : essai, tarifs, espace client. */
export function platformPage(page: 'essai' | 'tarifs' | 'licences', lang: 'fr' | 'en'): string | null {
  if (!platformUrl) return null;
  const path = { essai: '/essai?logiciel=kya-soldesign', tarifs: '/logiciels/kya-soldesign/tarifs', licences: '/espace/licences' }[page];
  return `${platformUrl}/${lang}${path}`;
}
