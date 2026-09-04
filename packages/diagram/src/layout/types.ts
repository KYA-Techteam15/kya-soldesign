import type { Point } from '../contracts.js';

/** Ordonnées des bandes électriques, calculées une fois pour toute la planche. */
export interface Bands {
  readonly yField: number;
  readonly pvHeight: number;
  readonly yFuse: number;
  readonly yCombiner: number;
  readonly ySpd: number;
  readonly ySwitch: number;
  readonly yController: number;
  readonly yInverter: number;
  readonly yAcBreaker: number;
  readonly yAcSpd: number;
  readonly yRcd: number;
  readonly yTransfer: number;
  readonly yBusbar: number;
  readonly yLoad: number;
  readonly contentBottom: number;
}

/** Colonnes verticales de la planche. */
export interface Lanes {
  readonly mainX: number;
  readonly mainWidth: number;
  readonly earthX: number;
  readonly batteryX: number;
  readonly batteryWidth: number;
  readonly sourceX: number;
}

/** Ce qu'une bande laisse à la suivante. */
export interface DcOutlet {
  readonly plus: Point;
  readonly minus: Point;
  readonly centerX: number;
  readonly left: number;
  readonly right: number;
}
