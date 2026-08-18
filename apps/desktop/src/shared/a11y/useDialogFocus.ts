import { useEffect, useRef, type RefObject } from 'react';

const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(open: boolean, container: RefObject<HTMLElement | null>, initial: RefObject<HTMLElement | null> | undefined, onClose: () => void) {
  const restore = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    restore.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (initial?.current ?? container.current?.querySelector<HTMLElement>('[data-dialog-initial]') ?? container.current?.querySelector<HTMLElement>(selector))?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !container.current) return;
      const focusable = [...container.current.querySelectorAll<HTMLElement>(selector)];
      const first = focusable[0]; const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); restore.current?.focus(); };
  }, [container, initial, open]);
}
