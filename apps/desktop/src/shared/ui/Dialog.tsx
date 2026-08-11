import { useId, useRef, type ReactNode } from 'react';
import { useDialogFocus } from '../a11y/useDialogFocus.js';

export function Dialog({ open, title, onClose, children }: { readonly open: boolean; readonly title: string; readonly onClose: () => void; readonly children: ReactNode }) {
  const container = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogFocus(open, container, undefined, onClose);
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><section ref={container} className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}><h2 id={titleId}>{title}</h2>{children}</section></div>;
}
