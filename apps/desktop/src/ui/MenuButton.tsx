import { useEffect, useId, useRef, useState } from 'react';

export interface MenuButtonItem {
  readonly id: string;
  readonly label: string;
  /** Précision sous le libellé (format, résolution…). */
  readonly hint?: string;
  readonly onSelect: () => void;
}

/**
 * Un bouton, plusieurs actions voisines (« Exporter » : PNG, SVG). L'en-tête garde la place d'un
 * seul bouton ; le choix se fait dans un menu qui se ferme au clic extérieur ou sur Échap.
 */
export function MenuButton({ label, items, disabled = false, primary = false }: {
  readonly label: string;
  readonly items: readonly MenuButtonItem[];
  readonly disabled?: boolean;
  readonly primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    rootRef.current?.querySelector<HTMLButtonElement>('.menu-button-list button')?.focus();
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="menu-button" ref={rootRef}>
      <button
        type="button"
        className={`btn ${primary ? 'btn-primary' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {label}<span className="menu-button-caret" aria-hidden="true" />
      </button>
      {open && (
        <div className="menu-button-list" role="menu" id={menuId}>
          {items.map((item) => (
            <button key={item.id} type="button" role="menuitem" onClick={() => { setOpen(false); item.onSelect(); }}>
              <b>{item.label}</b>
              {item.hint && <small>{item.hint}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
