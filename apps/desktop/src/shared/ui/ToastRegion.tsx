export interface ToastMessage { readonly id: string; readonly message: string; }
export function ToastRegion({ messages }: { readonly messages: readonly ToastMessage[] }) {
  return <div className="toast-region" aria-live="polite" aria-atomic="true">{messages.map((toast) => <div key={toast.id} className="toast" role="status">{toast.message}</div>)}</div>;
}
