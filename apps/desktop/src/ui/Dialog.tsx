/**
 * Dialogue générique.
 *
 * La v2 s'en sert pour tout ce qui est ponctuel : on ouvre, on décide, on
 * ferme, et l'écran principal ne paie pas la place d'une action qu'on fait
 * une fois par dossier. `ConfirmDialog` reste réservé aux confirmations
 * oui/non ; celui-ci accueille du contenu.
 */

import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({
  title,
  lead,
  wide = false,
  onClose,
  footer,
  children,
}: {
  title: string;
  lead?: string;
  wide?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <span>{title}</span>
          {lead && <small>{lead}</small>}
          <button className="modal-x" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}
