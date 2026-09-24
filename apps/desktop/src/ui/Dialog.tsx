/**
 * Dialogue générique.
 *
 * La v2 s'en sert pour tout ce qui est ponctuel : on ouvre, on décide, on
 * ferme, et l'écran principal ne paie pas la place d'une action qu'on fait
 * une fois par dossier. `ConfirmDialog` reste réservé aux confirmations
 * oui/non ; celui-ci accueille du contenu.
 *
 * Un clic hors du dialogue ne le ferme pas : une saisie en cours ne doit pas
 * disparaître sur un clic égaré. On ferme par ✕, Échap ou les boutons du pied.
 */

import { useId, useRef, type ReactNode } from 'react';
import { useT } from '../i18n';
import { useModal } from './useModal';

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
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const leadId = useId();
  useModal(ref, onClose);

  return (
    <div className="scrim">
      <div
        ref={ref}
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={lead ? leadId : undefined}
        tabIndex={-1}
      >
        <header>
          <span id={titleId}>{title}</span>
          {lead && <small id={leadId}>{lead}</small>}
          <button className="modal-x" onClick={onClose} aria-label={t('dialog.fermer')}>
            ✕
          </button>
        </header>
        <div className="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}
