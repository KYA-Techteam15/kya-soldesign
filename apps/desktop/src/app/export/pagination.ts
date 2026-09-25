/**
 * Répartition des blocs d'un document sur des feuilles A4 (spec 012, FR-C1).
 *
 * L'aperçu mesure chaque bloc dans la page réelle, puis cette fonction les distribue : ce qui
 * s'affiche est ce qui s'imprime, feuille pour feuille, et « page x / y » dit vrai. Un titre ne
 * reste jamais seul en bas de page ; un tableau trop long se poursuit sur la feuille suivante,
 * son en-tête répété.
 */
export interface MeasuredBlock {
  /** Hauteur du bloc, marges comprises. */
  readonly height: number;
  /** Un titre de section suit son premier contenu. */
  readonly keepWithNext: boolean;
  /** Tableau : hauteur de l'en-tête et de chaque ligne, pour le couper entre deux lignes. */
  readonly table?: { readonly head: number; readonly rows: readonly number[] };
  /** Bloc réductible (planche) : il accepte de descendre jusqu'à cette hauteur pour finir la feuille. */
  readonly minHeight?: number;
}

export interface PagePiece {
  readonly block: number;
  /** Lignes du tableau portées par cette feuille, `[début, fin)`. */
  readonly rows?: readonly [number, number];
}

/** Il faut au moins l'en-tête et deux lignes pour commencer un tableau en bas de page. */
const MIN_TABLE_ROWS = 2;

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Hauteur minimale à garder avec un titre : le bloc suivant, ou le début de son tableau. */
function leadHeight(block: MeasuredBlock | undefined): number {
  if (block === undefined) return 0;
  if (block.table === undefined) return block.minHeight ?? block.height;
  return block.table.head + sum(block.table.rows.slice(0, MIN_TABLE_ROWS));
}

export function paginate(blocks: readonly MeasuredBlock[], available: number): PagePiece[][] {
  const pages: PagePiece[][] = [[]];
  let used = 0;
  const current = () => pages[pages.length - 1]!;
  const newPage = () => { if (current().length > 0) { pages.push([]); used = 0; } };

  blocks.forEach((block, index) => {
    const lead = block.keepWithNext ? Math.min(leadHeight(blocks[index + 1]), available / 2) : 0;
    if (used + block.height + lead <= available) {
      current().push({ block: index });
      used += block.height;
      return;
    }
    if (block.minHeight !== undefined) {
      // Réductible : il finit la feuille s'il y tient à sa taille minimale, sinon il en ouvre une.
      if (used + block.minHeight + lead > available) newPage();
      current().push({ block: index });
      used = Math.min(available, used + block.height);
      return;
    }
    const table = block.table;
    if (table === undefined || table.rows.length === 0) {
      // Bloc d'un seul tenant : il ouvre une feuille (et la déborde s'il est plus grand qu'elle).
      newPage();
      current().push({ block: index });
      used += block.height;
      return;
    }
    // Tableau : il commence ici s'il reste la place de son en-tête et de deux lignes, sinon plus loin.
    const extra = Math.max(0, block.height - table.head - sum(table.rows));
    if (used + extra + leadHeight(block) > available) newPage();
    if (used + block.height <= available) {
      current().push({ block: index });
      used += block.height;
      return;
    }
    let start = 0;
    let first = true;
    while (start < table.rows.length) {
      const room = available - used - table.head - (first ? extra : 0);
      let end = start;
      let taken = 0;
      while (end < table.rows.length && taken + table.rows[end]! <= room) { taken += table.rows[end]!; end += 1; }
      if (end === start) end = start + 1; // une ligne plus haute qu'une feuille : elle passe seule
      // Pas de ligne veuve : la suite du tableau emporte au moins deux lignes sur la feuille suivante.
      const left = table.rows.length - end;
      if (left > 0 && left < MIN_TABLE_ROWS && end - start > MIN_TABLE_ROWS) end -= MIN_TABLE_ROWS - left;
      current().push({ block: index, rows: [start, end] });
      used += table.head + (first ? extra : 0) + sum(table.rows.slice(start, end));
      start = end;
      first = false;
      if (start < table.rows.length) newPage();
    }
  });
  return pages;
}
