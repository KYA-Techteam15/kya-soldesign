import { useEffect, useRef } from 'react';

/**
 * Peinture des heures au glisser. Le premier clic décide du geste : sur une heure libre on
 * ajoute, sur une heure prise on retire ; le glisser applique ce même geste aux heures survolées,
 * sur la même ligne (une ligne = un appareil).
 */
export function useHourPainter(isOn: (row: string, hour: number) => boolean, set: (row: string, hour: number, on: boolean) => void) {
  const gesture = useRef<{ row: string; on: boolean } | null>(null);

  useEffect(() => {
    const end = () => { gesture.current = null; };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  return (row: string, hour: number) => ({
    onPointerDown: (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const on = !isOn(row, hour);
      gesture.current = { row, on };
      set(row, hour, on);
    },
    onPointerEnter: () => {
      const current = gesture.current;
      if (current !== null && current.row === row) set(row, hour, current.on);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        set(row, hour, !isOn(row, hour));
      }
    },
  });
}
