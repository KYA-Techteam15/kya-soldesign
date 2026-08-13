import { useId, useRef, type ReactNode } from 'react';
import { useDialogFocus } from '../a11y/useDialogFocus.js';

export function Dialog({ open, title, onClose, children }: { readonly open: boolean; readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogFocus(open, container, undefined, onClose);
  if (!open) return null;
  return <div className="scrim" role="presentation" onMouseDown={onClose}><section ref={container} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}><header><h2 className="h-page" id={titleId}>{title}</h2><button className="modal-x" aria-label="Fermer" onClick={onClose}>{'×'}</button></header><div className="body">{children}</div></section></div>;
}
