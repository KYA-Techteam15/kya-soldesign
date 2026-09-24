/**
 * L'encoche de réouverture du panneau verdict.
 *
 * Replier le panneau le faisait disparaître dans une pastille de la barre du
 * haut, loin de l'endroit d'où il venait : on ne savait plus qu'il existait.
 * L'encoche reste au bord droit, à l'aplomb du panneau qu'elle rouvre, porte
 * son libellé et la valeur qui compte, et se déplace en hauteur si elle gêne
 * ce qu'on lit.
 */

import { useRef, useState } from 'react';
import { useUi } from '../store/ui';
import { fmt } from '../domain/format';
import { useT } from '../i18n';

export function VerdictTab({ svi, viable }: { svi: number | null; viable: boolean }) {
  const t = useT();
  const setVerdictCollapsed = useUi((s) => s.setVerdictCollapsed);
  const top = useUi((s) => s.verdictTabTop);
  const setTop = useUi((s) => s.setVerdictTabTop);

  const [dragging, setDragging] = useState(false);
  /* Un glissement de quelques pixels reste un clic : sans ce seuil, viser
     l'encoche la déplaçait au lieu de rouvrir le panneau. */
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    moved.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return;
    if (Math.abs(e.movementY) > 0) moved.current = true;
    setTop((e.clientY / window.innerHeight) * 100);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    if (!moved.current) setVerdictCollapsed(false);
  };

  return (
    <button
      className={`verdict-tab ${svi === null ? '' : viable ? 'ok' : 'bad'} ${
        dragging ? 'is-drag' : ''
      }`}
      style={{ top: `${top}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={t('verdictTab.rouvrirLePanneauGlisser')}
      aria-label={t('verdictTab.rouvrirLePanneauVerdict')}
    >
      <span className="verdict-tab-grip" aria-hidden="true" />
      <span className="verdict-tab-txt">
        {t('v.viability')}
        {svi !== null && <b>{fmt(svi, 2)}</b>}
      </span>
    </button>
  );
}
