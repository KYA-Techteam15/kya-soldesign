import { useEffect, useRef, type RefObject } from 'react';

/** Pile des dialogues ouverts : seul celui du dessus répond à Échap et au Tab. */
const stack: symbol[] = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => element.offsetParent !== null || element === document.activeElement);
}

/**
 * Comportement commun des dialogues modaux (WAI-ARIA « dialog ») :
 * - le focus entre dans le dialogue à l'ouverture et revient à l'élément d'origine à la fermeture ;
 * - Tab et Maj+Tab restent dans le dialogue ;
 * - Échap ferme uniquement le dialogue du dessus.
 */
export function useModal(ref: RefObject<HTMLElement | null>, onClose: (() => void) | null): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const id = Symbol('dialog');
    stack.push(id);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = ref.current;
    if (container && !container.contains(document.activeElement)) {
      const preferred = container.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
      (preferred ?? focusables(container)[0] ?? container).focus();
    }
    const onKey = (event: KeyboardEvent) => {
      if (stack.at(-1) !== id || !ref.current) return;
      if (event.key === 'Escape' && onCloseRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables(ref.current);
      if (items.length === 0) { event.preventDefault(); return; }
      const first = items[0]!; const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (!ref.current.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      const index = stack.indexOf(id);
      if (index >= 0) stack.splice(index, 1);
      previous?.focus();
    };
  }, [ref]);
}
