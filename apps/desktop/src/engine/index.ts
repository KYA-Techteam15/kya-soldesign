/**
 * Point d'injection unique du moteur de calcul.
 *
 * Remplacer `MockEngine` par l'implémentation réelle se fait ICI, sur une seule ligne.
 * Aucune vue n'importe `MockEngine` directement.
 */

import { MockEngine } from './MockEngine';
import type { SizingEngine } from './SizingEngine';

export const engine: SizingEngine = new MockEngine();

/** Vrai tant que les calculs sont simulés — pilote le bandeau d'avertissement. */
export const ENGINE_IS_SIMULATED = true;

export type * from './SizingEngine';
