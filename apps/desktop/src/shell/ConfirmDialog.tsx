import { useId, useRef } from 'react';
import { useT } from '../i18n';
import { useUi, type ConfirmRequest } from '../store/ui';
import { useModal } from '../ui/useModal';

export function ConfirmDialog() {
  const confirm = useUi((s) => s.confirm);
  const close = useUi((s) => s.closeConfirm);
  if (!confirm) return null;
  return <ConfirmBody confirm={confirm} close={close} />;
}

/** Confirmation oui/non : le focus part sur « Annuler », l'action sûre. */
function ConfirmBody({ confirm, close }: { readonly confirm: ConfirmRequest; readonly close: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const messageId = useId();
  useModal(ref, close);
  return (
    <div className="scrim">
      <div ref={ref} className="modal" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId} tabIndex={-1}>
        <header id={titleId}>{confirm.title}</header>
        <div className="body" id={messageId}>{confirm.message}</div>
        <footer>
          <button className="btn btn-ghost" onClick={close} data-autofocus>
            {t('g.cancel')}
          </button>
          <button
            className={confirm.danger ? 'btn btn-danger' : 'btn btn-ok'}
            onClick={() => {
              confirm.onConfirm();
              close();
            }}
          >
            {confirm.confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
