import { useCallback, useRef } from 'react';

/**
 * Navigation et édition de type tableur (critère B1).
 *
 * « Un tableau moins bon qu'Excel suffit à faire échouer le produit, quelle que soit
 * la qualité du reste. » Ce hook fournit ce qui manque à un simple champ de saisie :
 * flèches, Entrée, recopie vers le bas, collage d'une plage.
 *
 * Les champs de la grille portent `data-r` et `data-c`.
 */
export interface GridNavOptions {
  rowCount: number;
  colCount: number;
  /** Écrit une valeur. `row` peut dépasser rowCount : à charge d'ajouter la ligne. */
  setCell: (row: number, col: number, value: string) => void;
  /** Valeur affichée d'une cellule, pour la recopie vers le bas. */
  getCell: (row: number, col: number) => string;
  addRow: () => void;
  removeRow?: (row: number) => void;
}

export function useGridNav(opts: GridNavOptions) {
  const ref = useRef<HTMLDivElement>(null);

  const focusCell = useCallback((r: number, c: number) => {
    const el = ref.current?.querySelector<HTMLInputElement>(
      `input[data-r="${r}"][data-c="${c}"]`,
    );
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT') return;
      const r = Number(target.dataset.r);
      const c = Number(target.dataset.c);
      if (Number.isNaN(r) || Number.isNaN(c)) return;

      const move = (dr: number, dc: number) => {
        e.preventDefault();
        const nr = Math.max(0, Math.min(opts.rowCount - 1, r + dr));
        const nc = Math.max(0, Math.min(opts.colCount - 1, c + dc));
        focusCell(nr, nc);
      };

      // Recopier la valeur du dessus — le geste le plus utilisé après la saisie
      if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (r > 0) opts.setCell(r, c, opts.getCell(r - 1, c));
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          move(-1, 0);
          break;
        case 'ArrowDown':
          move(1, 0);
          break;
        case 'Tab':
          // laissé au navigateur : l'ordre naturel suit déjà la grille
          break;
        case 'Enter': {
          e.preventDefault();
          if (r === opts.rowCount - 1) {
            opts.addRow();
            // la ligne n'existe pas encore au moment du focus
            setTimeout(() => focusCell(r + 1, 0), 0);
          } else {
            focusCell(r + 1, c);
          }
          break;
        }
        case 'Escape':
          (target as HTMLInputElement).blur();
          break;
        default:
          break;
      }
    },
    [focusCell, opts],
  );

  /** Collage d'une plage Excel : lignes séparées par \n, cellules par \t. */
  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT') return;
      const text = e.clipboardData.getData('text/plain');
      if (!text.includes('\t') && !text.includes('\n')) return; // valeur simple

      e.preventDefault();
      const r0 = Number(target.dataset.r);
      const c0 = Number(target.dataset.c);
      const rows = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');

      const missing = r0 + rows.length - opts.rowCount;
      for (let i = 0; i < missing; i++) opts.addRow();

      // Les lignes ajoutées n'existent qu'au rendu suivant
      setTimeout(() => {
        rows.forEach((line, i) => {
          line.split('\t').forEach((cell, j) => {
            const c = c0 + j;
            if (c < opts.colCount) opts.setCell(r0 + i, c, cell.trim());
          });
        });
      }, 0);
    },
    [opts],
  );

  return { ref, onKeyDown, onPaste, focusCell };
}
