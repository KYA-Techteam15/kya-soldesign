import type { ReactNode } from 'react';

export function Flow({ children, compact = false }: { readonly children: ReactNode; readonly compact?: boolean }) {
  return <div className={compact ? 'flow flow-compact' : 'flow'}>{children}</div>;
}
