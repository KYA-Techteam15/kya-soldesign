/**
 * Prix et marges du matériel principal, sans écriture implicite dans le projet.
 *
 * - Un prix unitaire à 0 est « automatique » : il se déduit du coût spécifique des
 *   hypothèses et de la référence **actuellement** retenue (kWc par module, kWh
 *   par batterie, kW par onduleur). Changer de module change donc le prix.
 * - Un prix saisi est « manuel » : conservé tel quel et signalé comme tel.
 * - Tant qu'aucune marge n'a été saisie, les marges des hypothèses s'appliquent.
 */
export type PriceSource = 'auto' | 'manual';

export interface MainLineInput {
  /** Prix unitaire saisi, unités mineures ; 0 = automatique. */
  readonly unitPrice: number;
  /** Marge saisie, fraction. */
  readonly marginRatio: number;
  /** Coût spécifique des hypothèses (unités mineures par kWc, kWh ou kW). */
  readonly specificCost: number;
  /** Marge des hypothèses, fraction. */
  readonly assumptionMarginRatio: number;
  /** Taille d'une unité de la référence retenue (kWc, kWh ou kW), null sans dimensionnement. */
  readonly unitSize: number | null;
}

export interface MainLineCost {
  readonly unitPrice: number;
  readonly marginRatio: number;
  readonly priceSource: PriceSource;
}

export function effectiveMainLines<Key extends string>(lines: Readonly<Record<Key, MainLineInput>>): Record<Key, MainLineCost> {
  const entries = Object.entries(lines) as [Key, MainLineInput][];
  const marginsFromAssumptions = entries.every(([, line]) => line.unitPrice === 0 && line.marginRatio === 0);
  return Object.fromEntries(entries.map(([key, line]) => [key, {
    unitPrice: line.unitPrice > 0 ? line.unitPrice : line.unitSize === null ? 0 : Math.round(line.unitSize * line.specificCost),
    marginRatio: marginsFromAssumptions ? line.assumptionMarginRatio : line.marginRatio,
    priceSource: line.unitPrice > 0 ? 'manual' : 'auto',
  }])) as Record<Key, MainLineCost>;
}

/** Vrai tant que le chiffrage suit entièrement les hypothèses (aucun prix ni marge saisi). */
export function marginsFollowAssumptions(lines: readonly { readonly unitPrice: number; readonly marginRatio: number }[]): boolean {
  return lines.every((line) => line.unitPrice === 0 && line.marginRatio === 0);
}
