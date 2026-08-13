/**
 * Signale que la feuille se poursuit sous la coupe.
 *
 * Trois étapes sur huit dépassent la hauteur utile — le chiffrage de 235 px —
 * et rien ne le disait : Chrome ne peint la barre de défilement qu'au survol,
 * et le contenu s'interrompt au ras du pied de page. Un utilisateur qui
 * arrive sur l'écran n'a aucune raison de soupçonner qu'il manque des champs.
 *
 * Le repère se pose sur le conteneur `.pane-center.pinned` et compte ce qui
 * reste, en groupes ou en champs selon ce que la section contient. Un clic
 * fait défiler jusqu'au bas.
 */

import { useEffect, useRef, useState } from 'react';

export function MoreBelow({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const [left, setLeft] = useState(0);
  const [unit, setUnit] = useState<'group' | 'field'>('group');
  const [bottom, setBottom] = useState(0);
  const sheetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    const sheet = host.querySelector<HTMLElement>(':scope > .sheet');
    sheetRef.current = sheet;
    if (!sheet) return;

    const measure = () => {
      const rest = sheet.scrollHeight - sheet.clientHeight - sheet.scrollTop;
      // 8 px de marge : un résidu d'arrondi n'est pas du contenu.
      const more = rest > 8;
      host.dataset.more = more ? '1' : '0';
      if (!more) {
        setLeft(0);
        return;
      }
      /* Compter les vrais repères de lecture plutôt que les enfants directs :
         une section unique peut contenir tout le formulaire, et « encore
         1 bloc » ne dirait rien de ce qui reste. On compte les groupes de
         champs, sinon les champs eux-mêmes. */
      const cut = sheet.getBoundingClientRect().bottom;
      const below = (sel: string) =>
        [...sheet.querySelectorAll(sel)].filter(
          (el) => el.getBoundingClientRect().top > cut - 20,
        ).length;
      const groups = below('.form-stack > *, .sheet > section, .sheet > .params');
      setLeft(groups > 0 ? groups : below('.uf, .form-rows > *'));
      setUnit(groups > 0 ? 'group' : 'field');
    };

    measure();
    sheet.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(sheet);
    for (const child of sheet.children) ro.observe(child);
    return () => {
      sheet.removeEventListener('scroll', measure);
      ro.disconnect();
      delete host.dataset.more;
    };
  });

  // Position verticale : juste au-dessus de la barre d'avancement.
  useEffect(() => {
    const host = containerRef.current;
    const sheet = sheetRef.current;
    if (!host || !sheet) return;
    setBottom(host.getBoundingClientRect().bottom - sheet.getBoundingClientRect().bottom + 10);
  });

  const jump = () => {
    const sheet = sheetRef.current;
    if (sheet) sheet.scrollTo({ top: sheet.scrollHeight, behavior: 'smooth' });
  };

  const label =
    left <= 0
      ? 'Suite plus bas'
      : unit === 'group'
        ? `Encore ${left} ${left > 1 ? 'groupes' : 'groupe'}`
        : `Encore ${left} ${left > 1 ? 'champs' : 'champ'}`;

  return (
    <>
      <span className="more-fade" style={{ bottom }} aria-hidden />
      <button
        className="more-cue"
        style={{ bottom: bottom + 8 }}
        onClick={jump}
        tabIndex={-1}
        title="Afficher la suite de la feuille"
      >
        <span>{label}</span>
        <span aria-hidden>↓</span>
      </button>
    </>
  );
}
