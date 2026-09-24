import { useT } from '../i18n';
import { useUi } from '../store/ui';

export function Toasts() {
  const t = useT();
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" role="region" aria-label={t('toasts.label')}>
      {toasts.map((x) => (
        <div key={x.id} className={`toast ${x.kind}`} role={x.kind === 'error' ? 'alert' : 'status'}>
          <b>{x.title}</b>
          {x.detail && <span>{x.detail}</span>}
          <span className="toast-actions">
            {x.action && <button type="button" className="btn toast-action" onClick={() => { x.action!.run(); dismiss(x.id); }}>{x.action.label}</button>}
            <button type="button" className="toast-close" aria-label={t('g.close')} onClick={() => dismiss(x.id)}>✕</button>
          </span>
        </div>
      ))}
    </div>
  );
}
