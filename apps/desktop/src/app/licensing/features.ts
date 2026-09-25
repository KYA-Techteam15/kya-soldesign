/**
 * Catalogue des fonctions soumises à licence (spec 012, FR-D3, P-6).
 *
 * Le code ne connaît que ces identifiants, jamais les noms d'édition : le lien édition → fonctions
 * vit côté plateforme d'administration et arrive dans le jeton de licence. Changer une offre ne
 * demande donc pas de nouvelle version du logiciel.
 */
export const FEATURES = [
  /** Parcours autonome tout-en-un, calculs complets. */
  'system.aio',
  /** Optimisation « Mes références », propositions simulées. */
  'sizing.optimize',
  /** Export Word des documents. */
  'documents.word',
  /** Facture proforma et prix de vente dans les documents. */
  'documents.pricing',
  /** Émission et révisions du dossier. */
  'lifecycle.issue',
  /** Matériel ajouté par l'utilisateur au catalogue. */
  'catalog.userEquipment',
] as const;

export type FeatureId = (typeof FEATURES)[number];

export function isFeatureId(value: unknown): value is FeatureId {
  return typeof value === 'string' && (FEATURES as readonly string[]).includes(value);
}

/** Limites chiffrées portées par le jeton ; `null` : sans limite. */
export interface LicenseLimits {
  readonly maxProjects: number | null;
  readonly seats: number;
}
