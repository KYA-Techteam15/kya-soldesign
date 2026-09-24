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
import { useT } from '../i18n';

export function MoreBelow({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const t = useT();
  const [left, setLeft] = useState(0);
  const [unit, setUnit] = useState<'group' | 'field'>('group');
  const [bottom, setBottom] = useState(0);
  const sheetRef = useRef<HTMLElement | null>(null);

  /* Les écrans de l'atelier sont chargés à la demande : la feuille apparaît
     après le rendu de la coque. On la suit donc à chaque remplacement, faute de
     quoi le repère restait mesuré sur « rien », posé sur la barre d'avancement,
     et captait le clic de « Imprimer le dossier ». */
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    let sheet: HTMLElement | null = null;
    let detach = () => {};

    const attach = () => {
      // Dossier émis : la feuille est enveloppée par le verrou de lecture seule.
      const next = host.querySelector<HTMLElement>(':scope > .sheet, :scope > .ro-lock > .sheet');
      if (next === sheet) return;
      detach();
      sheet = next;
      sheetRef.current = next;
      host.dataset.more = '0';
      if (next) detach = observe(host, next);
    };
    const observer = new MutationObserver(attach);
    observer.observe(host, { childList: true });
    attach();
    return () => {
      observer.disconnect();
      detach();
      delete host.dataset.more;
    };
  }, [containerRef]);

  function observe(host: HTMLElement, sheet: HTMLElement): () => void {
    const measure = () => {
      // Juste au-dessus de la barre d'avancement, quelle que soit sa hauteur.
      setBottom(host.getBoundingClientRect().bottom - sheet.getBoundingClientRect().bottom + 10);
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
    ro.observe(host);
    for (const child of sheet.children) ro.observe(child);
    // Un onglet qui remplace le contenu (dossier : synthèse → documents) change les blocs suivis.
    const blocks = new MutationObserver(() => {
      for (const child of sheet.children) ro.observe(child);
      measure();
    });
    blocks.observe(sheet, { childList: true });
    return () => {
      sheet.removeEventListener('scroll', measure);
      ro.disconnect();
      blocks.disconnect();
    };
  }

  const jump = () => {
    const sheet = sheetRef.current;
    if (sheet) sheet.scrollTo({ top: sheet.scrollHeight, behavior: 'smooth' });
  };

  const label =
    left <= 0
      ? t('moreBelow.suitePlusBas')
      : unit === 'group'
        ? t(left > 1 ? 'moreBelow.groups' : 'moreBelow.group').replace('{count}', String(left))
        : t(left > 1 ? 'moreBelow.fields' : 'moreBelow.field').replace('{count}', String(left));

  return (
    <>
      <span className="more-fade" style={{ bottom }} aria-hidden />
      <button
        className="more-cue"
        style={{ bottom: bottom + 8 }}
        onClick={jump}
        tabIndex={-1}
        title={t('moreBelow.afficherLaSuiteDe')}
      >
        <span>{label}</span>
        <span aria-hidden>↓</span>
      </button>
    </>
  );
}
