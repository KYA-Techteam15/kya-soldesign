import { useCallback, useRef, useState, type ReactNode } from 'react';

/**
 * Provenance : tout nombre affiché remonte à ses hypothèses en un geste (critère B3).
 *
 * La bulle est en `position: fixed`, donc rattachée à la fenêtre et non au
 * flux. En absolu, elle était rognée par tous les conteneurs à
 * `overflow: hidden` — la liste de KPI, les tableaux, les cartes — et
 * n'apparaissait qu'à moitié ou pas du tout. Aucun z-index ne corrige cela :
 * un ancêtre qui rogne rogne, quelle que soit la pile.
 *
 * La position se calcule à l'ouverture : sous l'ancre si la place existe,
 * au-dessus sinon, et ramenée dans la fenêtre en largeur.
 */
const POP_W = 268;
const GAP = 7;
const MARGIN = 8;

export function Prov({
  children,
  title,
  formula,
  rows,
  source,
}: {
  children: ReactNode;
  title: string;
  formula?: string;
  rows: [string, string][];
  source?: string;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const place = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Hauteur estimée avant mesure : suffisante pour choisir le côté.
    const h = 40 + rows.length * 18 + (formula ? 34 : 0) + (source ? 40 : 0);
    const below = window.innerHeight - r.bottom;
    const top = below > h + GAP + MARGIN ? r.bottom + GAP : Math.max(MARGIN, r.top - h - GAP);
    const left = Math.min(
      Math.max(MARGIN, r.right - POP_W),
      window.innerWidth - POP_W - MARGIN,
    );
    setPos({ left, top });
  }, [formula, rows.length, source]);

  return (
    <span
      className="prov"
      tabIndex={0}
      ref={anchor}
      onPointerEnter={place}
      onFocus={place}
      onPointerLeave={() => setPos(null)}
      onBlur={() => setPos(null)}
    >
      {children}
      <span className="pop" style={pos ? { left: pos.left, top: pos.top } : undefined}>
        <span className="pop-h5">{title}</span>
        {formula && <span className="formula">{formula}</span>}
        <span className="pop-dl">
          {rows.map(([k, v]) => (
            <span className="pop-row" key={k}>
              <span className="pop-dt">{k}</span>
              <span className="pop-dd">{v}</span>
            </span>
          ))}
        </span>
        {source && <span className="src">{source}</span>}
      </span>
    </span>
  );
}
