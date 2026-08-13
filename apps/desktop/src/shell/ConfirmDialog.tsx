import { useT } from '../i18n';
import { useUi } from '../store/ui';

export function ConfirmDialog() {
  const t = useT();
  const confirm = useUi((s) => s.confirm);
  const close = useUi((s) => s.closeConfirm);
  if (!confirm) return null;
  return (
    <div className="scrim" onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header>{confirm.title}</header>
        <div className="body">{confirm.message}</div>
        <footer>
          <button className="btn btn-ghost" onClick={close}>
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
