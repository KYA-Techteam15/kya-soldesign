export interface ToastMessage { readonly id: string; readonly message: string; }
export function ToastRegion({ messages }: { readonly messages: readonly ToastMessage[] }) {
  return <div className="toasts" aria-live="polite" aria-atomic="true">{messages.map((toast) => <div key={toast.id} className="toast success" role="status"><b>{toast.message}</b></div>)}</div>;
}
