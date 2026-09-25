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
import { captionBox, inflate, intersects, lineHeight, textWidth, wireBoxes, type Box } from './geometry.js';

export { textWidth };

/** Une ligne d'étiquette : texte, corps, graisse, ton. */
export interface LabelLine {
  readonly text: string;
  readonly size?: number;
  readonly weight?: Caption['weight'];
  readonly tone?: Caption['tone'];
}

export type LabelSide = 'above' | 'below' | 'left' | 'right';

interface LabelRequest {
  readonly lines: readonly LabelLine[];
  readonly anchor: Box;
  readonly sides: readonly LabelSide[];
  readonly gap: number;
}

/** Espace laissé entre une étiquette et ce qu'elle désigne, ou ce qu'elle évite. */
const CLEARANCE = 3;

/**
 * Accumulateur de planche.
 *
 * Les symboles et les conducteurs sont posés d'abord ; les étiquettes sont demandées au fil du
 * placement puis posées toutes à la fin, chacune à la première position libre autour de ce
 * qu'elle désigne. Une étiquette ne peut donc jamais être posée sur un trait tracé après elle.
 */
export class Builder {
  readonly symbols: PlacedSymbol[] = [];
  readonly wires: Wire[] = [];
  readonly frames: Frame[] = [];
  readonly captions: Caption[] = [];
  readonly bom: BillOfMaterialRow[] = [];
  readonly junctions: Point[] = [];
  private readonly requests: LabelRequest[] = [];
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
      rotation?: 0 | -90;
      data?: Record<string, string | number | boolean>;
    } = {},
  ): PlacedSymbol {
    const size = SYMBOL_SIZE[kind];
    const rotated = extra.rotation === -90;
    const symbol: PlacedSymbol = {
      id: extra.id ?? this.nextId(kind),
      kind,
      x,
      y,
      width: extra.width ?? (rotated ? size.height : size.width),
      height: extra.height ?? (rotated ? size.width : size.height),
      reference: extra.reference ?? null,
      caption: extra.caption ?? null,
      data: extra.data ?? {},
      rotation: extra.rotation ?? 0,
      // Repère et libellé sont posés par `label()`, jamais par le dessin du symbole.
      showLabels: false,
    };
    this.symbols.push(symbol);
    return symbol;
  }

  wire(
    conductor: ConductorKind,
    points: readonly Point[],
    options: { dashed?: boolean; conductors?: number } = {},
  ): void {
    if (points.length < 2) return;
    this.wires.push({
      id: this.nextId('w'),
      conductor,
      points,
      dashed: options.dashed ?? false,
      annotation: null,
      ...(options.conductors === undefined ? {} : { conductors: options.conductors }),
    });
  }

  junction(point: Point): void {
    this.junctions.push(point);
  }

  frame(id: string, x: number, y: number, width: number, height: number): void {
    this.frames.push({ id, label: '', x, y, width, height });
  }

  /** Inscrit un appareil à la nomenclature. Le repérage est complété plus tard. */
  item(reference: string | null, designation: string, characteristic: string, quantity: number): void {
    if (!reference) return;
    this.bom.push({ reference, designation, characteristic, quantity, gridRef: '' });
  }

  /** Demande une étiquette : posée à la fin, du premier côté libre dans l'ordre donné. */
  label(lines: readonly (LabelLine | string | null | undefined | false)[], anchor: Box, sides: readonly LabelSide[], gap = 6): void {
    const kept = lines
      .filter((line): line is LabelLine | string => Boolean(line))
      .map((line) => (typeof line === 'string' ? { text: line } : line))
      .filter((line) => line.text.length > 0);
    if (kept.length > 0) this.requests.push({ lines: kept, anchor, sides, gap });
  }

  /** Largeur d'un bloc d'étiquette, pour réserver la place avant de le poser. */
  static blockWidth(lines: readonly (LabelLine | string | null | undefined | false)[]): number {
    return Math.max(0, ...lines.filter((line): line is LabelLine | string => Boolean(line)).map((line) => (typeof line === 'string' ? textWidth(line, 8) : textWidth(line.text, line.size ?? 8))));
  }

  /** Pose toutes les étiquettes demandées, dans l'ordre des demandes. */
  placeLabels(): void {
    for (const request of this.requests) this.placeOne(request);
    this.requests.length = 0;
  }

  private obstacles(): Box[] {
    return [
      ...this.symbols.map((symbol) => inflate(symbol, 1)),
      ...this.wires.flatMap((wire) => wireBoxes(wire)),
      ...this.captions.map((caption) => captionBox(caption)),
      ...this.frames.flatMap((frame) => [
        { x: frame.x, y: frame.y, width: frame.width, height: 1 },
        { x: frame.x, y: frame.y + frame.height, width: frame.width, height: 1 },
        { x: frame.x, y: frame.y, width: 1, height: frame.height },
        { x: frame.x + frame.width, y: frame.y, width: 1, height: frame.height },
      ]),
    ];
  }

  private layoutBlock(request: LabelRequest, side: LabelSide, shift: number): Caption[] {
    const { lines, anchor, gap } = request;
    const sizes = lines.map((line) => line.size ?? 8);
    const height = sizes.reduce((sum, size) => sum + lineHeight(size), 0);
    const width = Math.max(...lines.map((line, index) => textWidth(line.text, sizes[index]!)));
    let left: number;
    let top: number;
    let anchorMode: Caption['anchor'];
    if (side === 'above' || side === 'below') {
      anchorMode = 'middle';
      left = anchor.x + anchor.width / 2 + shift;
      top = side === 'above' ? anchor.y - gap - height : anchor.y + anchor.height + gap;
    } else {
      anchorMode = side === 'right' ? 'start' : 'end';
      left = side === 'right' ? anchor.x + anchor.width + gap : anchor.x - gap;
      top = anchor.y + anchor.height / 2 - height / 2 + shift;
    }
    void width;
    let cursor = top;
    return lines.map((line, index) => {
      const size = sizes[index]!;
      const caption: Caption = {
        id: this.nextId('c'),
        x: left,
        y: cursor + size * 0.82,
        text: line.text,
        anchor: anchorMode,
        size,
        weight: line.weight ?? 600,
        tone: line.tone ?? 'muted',
      };
      cursor += lineHeight(size);
      return caption;
    });
  }

  private placeOne(request: LabelRequest): void {
    const obstacles = this.obstacles();
    const free = (captions: readonly Caption[]) => captions.every((caption) => {
      const box = inflate(captionBox(caption), CLEARANCE);
      return !obstacles.some((other) => intersects(box, other));
    });
    const shifts = [0, 10, -10, 20, -20, 32, -32, 46, -46];
    for (const shift of shifts) {
      for (const side of request.sides) {
        const block = this.layoutBlock(request, side, shift);
        if (free(block)) {
          this.captions.push(...block);
          return;
        }
      }
    }
    // Aucune place libre : l'étiquette est posée au premier choix ; le contrôle des tests le signale.
    this.captions.push(...this.layoutBlock(request, request.sides[0] ?? 'above', 0));
  }

  /** Emprise réelle du dessin, étiquettes comprises. */
  extents(): Box {
    const boxes: Box[] = [
      ...this.symbols,
      ...this.frames,
      ...this.captions.map((caption) => captionBox(caption)),
      ...this.wires.flatMap((wire) => wireBoxes(wire)),
    ];
    const minX = Math.min(...boxes.map((box) => box.x));
    const minY = Math.min(...boxes.map((box) => box.y));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    const maxY = Math.max(...boxes.map((box) => box.y + box.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /** Translate tout le dessin : le placement travaille à l'origine, la planche le centre ensuite. */
  shift(dx: number, dy: number): void {
    const move = <T extends { x: number; y: number }>(item: T): T => ({ ...item, x: item.x + dx, y: item.y + dy });
    this.symbols.splice(0, this.symbols.length, ...this.symbols.map(move));
    this.frames.splice(0, this.frames.length, ...this.frames.map(move));
    this.captions.splice(0, this.captions.length, ...this.captions.map(move));
    this.junctions.splice(0, this.junctions.length, ...this.junctions.map(move));
    this.wires.splice(0, this.wires.length, ...this.wires.map((wire) => ({ ...wire, points: wire.points.map(move) })));
  }
}

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

/** Section ou longueur : sans zéros inutiles, au séparateur de la langue (« 2,5 », « 35 »). */
export const quantity = (value: number, labels: DiagramLabels): string =>
  String(Math.round(value * 100) / 100).replace('.', labels.decimal);

/** Calibre, ou mention explicite quand l'utilisateur n'a rien retenu. */
export const amps = (value: number | null, labels: DiagramLabels): string =>
  value === null ? labels.toBeDefined : `${num(value, 0, labels)} A`;

/** Section de câble en notation « n × section », comme sur un plan d'exécution. */
export function cableNote(
  cable: { conductors: number; sectionMm2: number | null; lengthM: number | null } | null,
  labels?: DiagramLabels,
): string | null {
  if (!cable || cable.sectionMm2 === null) return null;
  const format = (value: number) => (labels ? quantity(value, labels) : String(value));
  const section = `${cable.conductors} × ${format(cable.sectionMm2)} mm²`;
  return cable.lengthM === null ? section : `${section} · ${format(cable.lengthM)} m`;
}
