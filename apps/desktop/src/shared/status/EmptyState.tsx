import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return <section className="state-panel" role="status"><h2>{title}</h2>{children}</section>;
}
