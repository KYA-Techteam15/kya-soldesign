import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjects } from '../store/project';
import { useUi, VIBES, type Vibe } from '../store/ui';
import { SECTIONS } from '../routes/workshop/WorkshopLayout';
import { useT } from '../i18n';

const VIBE_NAME: Record<Vibe, string> = {
  sober: 'settings.vibe.sober',
  vivid: 'settings.vibe.vivid',
  radiant: 'settings.vibe.radiant',
};

interface Command {
  id: string;
  label: string;
  hint?: string;
  keys?: string;
  run: () => void;
}

/**
 * Palette de commandes. Attendue de tout outil professionnel en 2026, et le
 * seul moyen d'atteindre n'importe quoi sans lâcher le clavier.
 */
export function CommandPalette() {
  const t = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const open = useUi((state) => state.paletteOpen);
  const setPaletteOpen = useUi((state) => state.setPaletteOpen);
  const setOpen = (next: boolean | ((current: boolean) => boolean)) => setPaletteOpen(typeof next === 'function' ? next(useUi.getState().paletteOpen) : next);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);

  const ui = useUi();
  const { undo, redo, canUndo, canRedo, projects, create } = useProjects();

  const projectId = loc.pathname.match(/\/projet\/([^/]+)/)?.[1] ?? null;

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    if (projectId) {
      for (const s of SECTIONS) {
        list.push({
          id: `go-${s.slug}`,
          label: `${t('palette.goTo')} ${t(s.key)}`,
          hint: 'Atelier',
          run: () => nav(`/projet/${projectId}/atelier/${s.slug}`),
        });
      }
      list.push(
        { id: 'go-synoptique', label: t('palette.allerAuSchemaUnifilaire'), hint: 'Rapport', run: () => nav(`/projet/${projectId}/atelier/dossier?vue=synoptique`) },
        { id: 'go-documents', label: t('palette.genererLesDocuments'), hint: 'Rapport', run: () => nav(`/projet/${projectId}/atelier/dossier?vue=documents`) },
      );
    }

    list.push(
      { id: 'go-home', label: t('palette.retourALAccueil'), run: () => nav('/accueil') },
      { id: 'go-projects', label: t('palette.ouvrirLaListeDes'), run: () => nav('/accueil/projets') },
      { id: 'go-catalog', label: t('palette.ouvrirLeCatalogueMateriel'), run: () => nav('/catalogue') },
      { id: 'go-settings', label: t('palette.ouvrirLesReglages'), run: () => nav('/reglages') },
      { id: 'new', label: t('palette.nouveauProjetAutonomeTout'), run: () => {
          const id = create('standalone_all_in_one');
          void nav(`/projet/${id}/atelier/projet`);
        } },
      { id: 'theme', label: ui.theme === 'dark' ? t('palette.passerEnModeClair') : t('palette.passerEnModeSombre'), run: ui.toggleTheme },
      ...VIBES.filter((v) => v !== ui.vibe).map((v) => ({
        id: `vibe-${v}`,
        label: `${t('palette.switchStyle')} ${t(VIBE_NAME[v])}`,
        hint: 'Apparence',
        run: () => ui.setVibe(v),
      })),
      { id: 'lang', label: ui.lang === 'fr' ? t('palette.switchToEnglish') : t('palette.passerEnFrancais'), run: () => ui.setLang(ui.lang === 'fr' ? 'en' : 'fr') },
    );

    if (canUndo()) list.push({ id: 'undo', label: t('palette.annulerLaDerniereModification'), keys: 'Ctrl Z', run: undo });
    if (canRedo()) list.push({ id: 'redo', label: t('palette.redo'), keys: 'Ctrl Y', run: redo });

    for (const p of projects.slice(0, 6)) {
      list.push({
        id: `open-${p.id}`,
        label: `Ouvrir « ${p.name} »`,
        hint: p.details.clientName || 'Projet',
        run: () => nav(`/projet/${p.id}/atelier/projet`),
      });
    }
    return list;
  }, [projectId, nav, t, ui, canUndo, canRedo, undo, redo, projects, create]);

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? commands.filter((c) => c.label.toLowerCase().includes(needle))
    : commands;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQ('');
        setCursor(0);
        return;
      }
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (isTextEntry(e.target)) return; // laisser l'annulation du champ
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        if (isTextEntry(e.target)) return; // laisser le rétablissement du champ
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  if (!open) return null;

  const runAt = (i: number) => {
    const cmd = shown[i];
    if (!cmd) return;
    setOpen(false);
    cmd.run();
  };

  return (
    <div className="scrim palette-scrim" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="palette-input"
          placeholder={t('palette.queVoulezVousFaire')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(shown.length - 1, c + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              runAt(cursor);
            }
          }}
        />
        <div className="palette-list">
          {shown.length === 0 && <div className="palette-empty">{t('palette.none')}</div>}
          {shown.map((c, i) => (
            <button
              key={c.id}
              className={`palette-item ${i === cursor ? 'on' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => runAt(i)}
            >
              <span>{c.label}</span>
              {c.hint && <span className="palette-hint">{c.hint}</span>}
              {c.keys && <span className="kbd">{c.keys}</span>}
            </button>
          ))}
        </div>
        <div className="palette-foot">
          <span className="kbd">↑</span> <span className="kbd">↓</span> naviguer ·{' '}
          <span className="kbd">{t('loads2.entree')}</span> {t('palette.executer')} <span className="kbd">{t('palette.echap')}</span> fermer
        </div>
      </div>
    </div>
  );
}

/** Un champ de saisie garde sa propre annulation ; l’annulation du projet s’applique ailleurs. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
}
