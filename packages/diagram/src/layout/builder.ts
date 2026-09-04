import type {
  BillOfMaterialRow,
  Caption,
  ConductorKind,
  Frame,
  PlacedSymbol,
  Point,
  SymbolKind,
  Wire,
} from '../contracts.js';
import type { DiagramLabels } from '../labels.js';
import { SYMBOL_SIZE } from '../symbols.js';

/**
 * Accumulateur de planche.
 *
 * Les bandes n'écrivent jamais dans des tableaux nus : elles passent par ces
 * quelques primitives, ce qui garantit l'unicité des identifiants et rend le
 * placement reproductible d'un appel à l'autre.
 */
export class Builder {
  readonly symbols: PlacedSymbol[] = [];
  readonly wires: Wire[] = [];
  readonly frames: Frame[] = [];
  readonly captions: Caption[] = [];
  readonly bom: BillOfMaterialRow[] = [];
  private sequence = 0;

  constructor(readonly labels: DiagramLabels) {}

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  place(
    kind: SymbolKind,
    x: number,
    y: number,
    extra: {
      id?: string;
      reference?: string | null;
      caption?: string | null;
      width?: number;
      height?: number;
      data?: Record<string, string | number | boolean>;
    } = {},
  ): PlacedSymbol {
    const size = SYMBOL_SIZE[kind];
    const symbol: PlacedSymbol = {
      id: extra.id ?? this.nextId(kind),
      kind,
      x,
      y,
      width: extra.width ?? size.width,
      height: extra.height ?? size.height,
      reference: extra.reference ?? null,
      caption: extra.caption ?? null,
      data: extra.data ?? {},
    };
    this.symbols.push(symbol);
    return symbol;
  }

  wire(
    conductor: ConductorKind,
    points: readonly Point[],
    options: { dashed?: boolean; annotation?: string | null } = {},
  ): void {
    if (points.length < 2) return;
    this.wires.push({
      id: this.nextId('w'),
      conductor,
      points,
      dashed: options.dashed ?? false,
      annotation: options.annotation ?? null,
    });
  }

  caption(
    x: number,
    y: number,
    value: string,
    options: {
      anchor?: Caption['anchor'];
      size?: number;
      weight?: Caption['weight'];
      tone?: Caption['tone'];
    } = {},
  ): void {
    if (!value) return;
    this.captions.push({
      id: this.nextId('c'),
      x,
      y,
      text: value,
      anchor: options.anchor ?? 'middle',
      size: options.size ?? 9,
      weight: options.weight ?? 600,
      tone: options.tone ?? 'ink',
    });
  }

  frame(id: string, label: string, x: number, y: number, width: number, height: number): void {
    this.frames.push({ id, label, x, y, width, height });
  }

  /** Inscrit un appareil à la nomenclature. Le repérage est complété plus tard. */
  item(reference: string | null, designation: string, characteristic: string, quantity: number): void {
    if (!reference) return;
    this.bom.push({ reference, designation, characteristic, quantity, gridRef: '' });
  }
}

/** Trajet en L : on descend, puis on translate. */
export const vh = (from: Point, to: Point): Point[] => [from, { x: from.x, y: to.y }, to];
/** Trajet en L : on translate, puis on descend. */
export const hv = (from: Point, to: Point): Point[] => [from, { x: to.x, y: from.y }, to];
/** Trajet en Z : descente, translation à mi-hauteur, descente. */
export const vhv = (from: Point, to: Point, midY: number): Point[] => [
  from,
  { x: from.x, y: midY },
  { x: to.x, y: midY },
  to,
];

/**
 * Décide combien d'éléments d'une série sont réellement dessinés.
 * Au-delà du seuil, les éléments intermédiaires cèdent la place à une rupture.
 */
export function collapse(count: number, max: number): { head: number; tail: number; hidden: number } {
  if (count <= max) return { head: count, tail: 0, hidden: 0 };
  const head = Math.max(1, max - 2);
  return { head, tail: 1, hidden: count - head - 1 };
}

/** Nombre décimal, au séparateur de la langue du plan. */
export const num = (value: number, decimals: number, labels: DiagramLabels): string =>
  value.toFixed(decimals).replace('.', labels.decimal);

/** Calibre, ou mention explicite quand l'utilisateur n'a rien retenu. */
export const amps = (value: number | null, labels: DiagramLabels): string =>
  value === null ? labels.toBeDefined : `${num(value, 0, labels)} A`;

/** Section de câble en notation « n × section », comme sur un plan d'exécution. */
export function cableNote(
  cable: { conductors: number; sectionMm2: number | null; lengthM: number | null } | null,
): string | null {
  if (!cable || cable.sectionMm2 === null) return null;
  const section = `${cable.conductors} × ${cable.sectionMm2} mm²`;
  return cable.lengthM === null ? section : `${section} · ${cable.lengthM} m`;
}
