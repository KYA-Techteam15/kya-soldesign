import { paginate, type MeasuredBlock, type PagePiece } from './pagination.js';

/** Part de sa hauteur que la planche accepte de céder pour rester sous son titre. */
const DIAGRAM_MIN_RATIO = 0.6;

/**
 * Lit la scène de mesure de l'aperçu et en déduit la répartition de chaque partie.
 *
 * La scène porte, par partie (`data-section`), une feuille vide (`.a4-probe`) qui donne la hauteur
 * utile et la partie rendue d'un seul tenant (`.a4-measure`), bloc par bloc (`.a4-block`). Toutes
 * les hauteurs sont lues dans le même repère : la réduction d'aperçu ne fausse donc rien.
 */
export function measureSheets(stage: HTMLElement): Map<number, PagePiece[][]> {
  const pages = new Map<number, PagePiece[][]>();
  stage.querySelectorAll<HTMLElement>('[data-section]').forEach((group) => {
    const index = Number(group.dataset.section);
    const available = group.querySelector('.a4-probe .a4-flow')?.getBoundingClientRect().height ?? 0;
    const blocks = [...group.querySelectorAll<HTMLElement>('.a4-measure > .a4-flow > .a4-block')].map(measureBlock);
    if (available > 0) pages.set(index, paginate(blocks, available));
  });
  return pages;
}

function measureBlock(element: HTMLElement): MeasuredBlock {
  const kind = element.dataset.kind;
  const height = element.getBoundingClientRect().height;
  const table = element.querySelector('table.a4-tbl');
  return {
    height,
    keepWithNext: kind === 'heading' || kind === 'title',
    ...(kind === 'image' ? { minHeight: height * DIAGRAM_MIN_RATIO } : {}),
    ...(table === null ? {} : {
      table: {
        head: table.querySelector('thead')?.getBoundingClientRect().height ?? 0,
        rows: [...table.querySelectorAll('tbody tr')].map((row) => row.getBoundingClientRect().height),
      },
    }),
  };
}
