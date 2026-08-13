import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useUi } from '../store/ui';
import { useProjects } from '../store/project';
import type { Project } from '../domain/types';

interface Props {
  project?: Project | null;
  /** Action principale à droite. */
  primary?: { label: string; onClick: () => void };
  back?: string;
}

export function TopBar({ project, primary, back }: Props) {
  const t = useT();
  const nav = useNavigate();
  const { theme, toggleTheme, lang, setLang } = useUi();
  const { undo, redo, past, future } = useProjects();

  return (
    <header className="topbar">
      <button
        className="wordmark"
        onClick={() => nav('/accueil')}
        title={t('home.welcome')}
      >
        <i />
        KYA<span>-SolDesign</span>
      </button>

      <div className="crumbs">
        {back && (
          <button className="btn btn-ghost" onClick={() => nav(back)}>
            ← {t('app.back')}
          </button>
        )}
        {project && (
          <>
            <b>{project.name}</b>
            {project.details.projectNumber && (
              <span className="ref">n° {project.details.projectNumber}</span>
            )}
            {project.details.clientName && (
              <em>· {project.details.clientName}</em>
            )}
          </>
        )}
      </div>

      {/* La réouverture se fait par l'encoche du bord droit, à l'aplomb du
          panneau : une pastille ici prétendait au même rôle depuis l'autre
          bout de l'écran. */}
      {project && (
        <>
          <button
            className="btn btn-ghost"
            onClick={undo}
            disabled={past.length === 0}
            title="Annuler (Ctrl Z)"
          >
            ↶
          </button>
          <button
            className="btn btn-ghost"
            onClick={redo}
            disabled={future.length === 0}
            title="Rétablir (Ctrl Y)"
          >
            ↷
          </button>
        </>
      )}
      <button
        className="btn btn-ghost"
        title="Palette de commandes"
        onClick={() =>
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }),
          )
        }
      >
        {t('app.search')} <span className="kbd">Ctrl K</span>
      </button>
      <button
        className="btn btn-ghost"
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        title="Langue"
      >
        {lang === 'fr' ? 'FR' : 'EN'}
      </button>
      {/* Bascule de barre : rang fantôme, comme la langue et la palette. */}
      <button className="btn btn-ghost" onClick={toggleTheme}>
        {theme === 'dark' ? t('app.theme.light') : t('app.theme.dark')}
      </button>
      {primary && (
        <button className="btn btn-primary" onClick={primary.onClick}>
          {primary.label}
        </button>
      )}
    </header>
  );
}
