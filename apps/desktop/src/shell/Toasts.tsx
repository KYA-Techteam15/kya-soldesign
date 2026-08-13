import { useUi } from '../store/ui';

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  if (toasts.length === 0) return null;
  return (
    <div className="toasts">
      {toasts.map((x) => (
        <button key={x.id} className={`toast ${x.kind}`} onClick={() => dismiss(x.id)}>
          <b>{x.title}</b>
          {x.detail && <span>{x.detail}</span>}
        </button>
      ))}
    </div>
  );
}
