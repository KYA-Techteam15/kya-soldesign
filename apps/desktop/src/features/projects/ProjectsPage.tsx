import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplication } from '../../app/ApplicationProvider.js';
import { StatusBar } from '../../app/shell/StatusBar.js';
import { TopBar } from '../../app/shell/TopBar.js';
import { useT } from '../../shared/i18n/index.js';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog.js';
import { ToastRegion } from '../../shared/ui/ToastRegion.js';

export function ProjectsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { projects, removeProject, setCurrentProjectId } = useApplication();
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const visible = useMemo(() => projects.filter((project) => project.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [projects, query]);
  const open = (id: string) => { setCurrentProjectId(id); void navigate(`/projet/${id}/atelier/projet`); };
  const remove = () => { if (!target) return; removeProject(target); setTarget(null); setToast(t('projects.removeSuccess')); };

  return <div className="page">
    <TopBar back="/accueil" />
    <main className="page-body"><div className="page-inner">
      <div className="rowline">
        <h1 className="page-title">{t('projects.title')}</h1><span className="sep" />
        <input className="hdr-search" style={{ width: 240 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('projects.search')} aria-label={t('projects.search')} />
        <span className="label">{visible.length} projet(s)</span>
      </div>
      {visible.length ? <div className="proj-list">{visible.map((project) => <div className="proj-row" key={project.id}>
        <button style={{ textAlign: 'left' }} onClick={() => open(project.id)}><b>{project.name}</b><small>{t('system.aio')} · {t('app.sessionOnly')}</small></button>
        <span className="when">{project.updatedAt.slice(0, 10)}</span>
        <button className="btn" onClick={() => setTarget(project.id)}>{t('action.remove')}</button>
      </div>)}</div> : <div className="empty"><b>{t('projects.empty')}</b>{query ? 'Aucun dossier ne correspond à cette recherche.' : t('home.emptyProjectsHelp')}</div>}
    </div></main>
    <ConfirmDialog open={target !== null} title={t('dialog.removeProject')} body={t('dialog.removeProjectBody')} danger onClose={() => setTarget(null)} onConfirm={remove} />
    <ToastRegion messages={toast ? [{ id: 'project-removed', message: toast }] : []} />
    <StatusBar />
  </div>;
}
