import { useRef, type KeyboardEvent } from 'react';

export interface TabItem { readonly id: string; readonly label: string; }
export function Tabs({ items, activeId, onChange }: { readonly items: readonly TabItem[]; readonly activeId: string; readonly onChange: (id: string) => void }) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction || items.length === 0) return;
    event.preventDefault();
    const nextIndex = (index + direction + items.length) % items.length;
    const next = items[nextIndex];
    if (next) { onChange(next.id); tabs.current[nextIndex]?.focus(); }
  };
  return <div className="tabs" role="tablist">{items.map((item, index) => <button ref={(node) => { tabs.current[index] = node; }} key={item.id} id={`tab-${item.id}`} role="tab" aria-controls={`panel-${item.id}`} aria-selected={activeId === item.id} tabIndex={activeId === item.id ? 0 : -1} className={activeId === item.id ? 'tab active' : 'tab'} onKeyDown={(event) => move(event, index)} onClick={() => onChange(item.id)}>{item.label}</button>)}</div>;
}
