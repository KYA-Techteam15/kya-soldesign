import type { FeatureId, LicenseLimits } from './features.js';

/**
 * API de la plateforme d'administration, côté licences (contrat KYA-SolDesign, spec 012).
 *
 * `HttpAdminApi` l'implémente contre la plateforme KYA-EnergyMarket. Le logiciel ne contient plus
 * aucune simulation ni clé de signature : seules les clés publiques de la plateforme y figurent
 * (`platform.ts`), il ne peut que vérifier des jetons (T061).
 */
export interface EditionPlan {
  /** Profil d'édition dans le logiciel (`commercial`, `academic`, `student`…). */
  readonly edition: string;
  readonly plan: string;
  /** Durée en jours. */
  readonly days: number;
}

export interface EditionDescriptor {
  readonly edition: string;
  readonly features: readonly FeatureId[];
  readonly limits: LicenseLimits;
  readonly watermark: string | null;
  readonly graceDays: number;
  readonly plans: readonly EditionPlan[];
}

export type ActivateError = 'KEY_UNKNOWN' | 'SEATS_EXHAUSTED' | 'RATE_LIMITED';
export type RefreshError = 'LICENSE_UNKNOWN' | 'LICENSE_REVOKED' | 'DEVICE_RELEASED' | 'RATE_LIMITED';

export interface AdminApi {
  /** Heure du serveur : la référence contre une horloge de poste reculée. */
  now(): Promise<string>;
  catalog(): Promise<readonly EditionDescriptor[]>;
  activate(key: string, deviceId: string): Promise<{ readonly token: string } | { readonly error: ActivateError }>;
  refresh(licenseId: string, deviceId: string): Promise<{ readonly token: string } | { readonly error: RefreshError }>;
  release(licenseId: string, deviceId: string): Promise<void>;
}
