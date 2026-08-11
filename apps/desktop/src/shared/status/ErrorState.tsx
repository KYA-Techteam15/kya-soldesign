import type { ReactNode } from 'react';

export function ErrorState({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return <section className="state-panel" role="alert"><h2>{title}</h2>{children}</section>;
}
