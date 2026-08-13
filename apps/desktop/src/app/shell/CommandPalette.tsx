import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../shared/i18n/index.js';
import { useValidatedCopy } from '../../shared/i18n/useValidatedCopy.js';

const destinations = [['nav.home', '/accueil'], ['nav.projects', '/accueil/projets'], ['nav.catalog', '/catalogue'], ['nav.settings', '/reglages']] as const;

export function CommandPalette({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const navigate = useNavigate();
  const t = useT();
  const v = useValidatedCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const visible = useMemo(() => destinations.filter(([key]) => t(key).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query, t]);
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setQuery(''); setCursor(0); queueMicrotask(() => inputRef.current?.focus());
    } else {
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    }
  }, [open]);
  if (!open) return null;
  const run = (index: number) => { const destination = visible[index]; if (!destination) return; onClose(); void navigate(destination[1]); };
  return <div className="scrim palette-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="palette" role="dialog" aria-modal="true" aria-label={t('palette.title')} onKeyDown={(event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') { event.preventDefault(); setCursor((value) => Math.min(visible.length - 1, value + 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setCursor((value) => Math.max(0, value - 1)); }
      if (event.key === 'Enter') { event.preventDefault(); run(cursor); }
      if (event.key === 'Tab') {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input, button:not(:disabled)'));
        const first = controls[0]; const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <input ref={inputRef} className="palette-input" aria-label={t('app.search')} placeholder={t('palette.hint')} value={query} onChange={(event) => { setQuery(event.target.value); setCursor(0); }} />
      <div className="palette-list">{visible.length ? visible.map(([key, path], index) => <button key={path} aria-label={t(key)} className={`palette-item ${index === cursor ? 'on' : ''}`} onMouseEnter={() => setCursor(index)} onClick={() => run(index)}><span>{t(key)}</span><span className="palette-hint">{v('navigation')}</span></button>) : <div className="palette-empty">{t('catalog.empty')}</div>}</div>
      <div className="palette-foot"><span className="kbd">↑</span> <span className="kbd">↓</span> · <span className="kbd">{v('enter')}</span> · <span className="kbd">{v('escape')}</span></div>
    </div>
  </div>;
}
