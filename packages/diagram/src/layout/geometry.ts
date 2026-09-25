import type { Caption, DiagramPlan, Point, Wire } from '../contracts.js';

/**
 * Géométrie de planche : boîtes, segments, chevauchements.
 *
 * Sert deux fois : au placement, pour poser chaque étiquette là où elle ne touche rien ; dans les
 * tests, pour prouver qu'aucun texte ne recouvre un conducteur, un symbole ou un autre texte.
 */

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Largeur approchée d'un texte (chasse moyenne de la fonte de planche). Surestimer ne coûte qu'une marge. */
export const textWidth = (value: string, size: number): number => value.length * size * 0.56;

/** Hauteur de ligne d'un texte de corps `size`. */
export const lineHeight = (size: number): number => Math.round(size * 1.25 * 100) / 100;

export function intersects(a: Box, b: Box, padding = 0): boolean {
  return (
    a.x < b.x + b.width + padding &&
    b.x < a.x + a.width + padding &&
    a.y < b.y + b.height + padding &&
    b.y < a.y + a.height + padding
  );
}

export function inflate(box: Box, by: number): Box {
  return { x: box.x - by, y: box.y - by, width: box.width + by * 2, height: box.height + by * 2 };
}

/** Boîte d'un segment orthogonal, épaissie pour tenir compte du trait. */
export function segmentBox(a: Point, b: Point, thickness = 2): Box {
  const half = thickness / 2;
  return {
    x: Math.min(a.x, b.x) - half,
    y: Math.min(a.y, b.y) - half,
    width: Math.abs(b.x - a.x) + thickness,
    height: Math.abs(b.y - a.y) + thickness,
  };
}

export function wireBoxes(wire: Wire): Box[] {
  const boxes: Box[] = [];
  for (let index = 1; index < wire.points.length; index += 1) boxes.push(segmentBox(wire.points[index - 1]!, wire.points[index]!));
  return boxes;
}

/** Boîte d'un texte posé : la ligne de base est à `y`, l'œil occupe environ 0,8 corps au-dessus. */
export function captionBox(caption: Pick<Caption, 'x' | 'y' | 'text' | 'size' | 'anchor'>): Box {
  const width = textWidth(caption.text, caption.size);
  const x = caption.anchor === 'start' ? caption.x : caption.anchor === 'middle' ? caption.x - width / 2 : caption.x - width;
  return { x, y: caption.y - caption.size * 0.82, width, height: caption.size * 1.05 };
}

export interface Collision {
  readonly kind: 'text-text' | 'text-wire' | 'text-symbol';
  readonly text: string;
  readonly other: string;
}

/**
 * Chevauchements d'une planche : un texte sur un autre texte, sur un conducteur ou sur un symbole.
 * Les étiquettes internes aux symboles (numéro de module) ne sont pas des textes de planche.
 */
export function findCollisions(plan: DiagramPlan): Collision[] {
  const found: Collision[] = [];
  const texts = plan.captions.map((caption) => ({ caption, box: captionBox(caption) }));
  for (let i = 0; i < texts.length; i += 1) {
    for (let j = i + 1; j < texts.length; j += 1) {
      if (intersects(texts[i]!.box, texts[j]!.box, -0.5)) found.push({ kind: 'text-text', text: texts[i]!.caption.text, other: texts[j]!.caption.text });
    }
    for (const wire of plan.wires) {
      if (wireBoxes(wire).some((box) => intersects(texts[i]!.box, box, -0.5))) found.push({ kind: 'text-wire', text: texts[i]!.caption.text, other: wire.id });
    }
    for (const symbol of plan.symbols) {
      if (intersects(texts[i]!.box, symbol, -0.5)) found.push({ kind: 'text-symbol', text: texts[i]!.caption.text, other: `${symbol.kind}:${symbol.reference ?? symbol.id}` });
    }
  }
  return found;
}
