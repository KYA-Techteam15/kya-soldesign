import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplication } from '../../app/ApplicationProvider.js';
import { useT } from '../../shared/i18n/index.js';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog.js';
import { ToastRegion } from '../../shared/ui/ToastRegion.js';

export function ProjectsPage() {
  const t = useT(); const navigate = useNavigate(); const { projects, removeProject, setCurrentProjectId } = useApplication(); const [query, setQuery] = useState(''); const [target, setTarget] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  const visible = useMemo(() => projects.filter((project) => project.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [projects, query]);
  const remove = () => { if (!target) return; removeProject(target); setTarget(null); setToast(t('projects.removeSuccess')); };
  const open = (id: string) => { setCurrentProjectId(id); void navigate(`/projet/${id}/atelier/projet`); };
  return <main className="main-content"><header className="page-head"><h1>{t('projects.title')}</h1><p>{t('app.sessionOnly')}</p></header><input className="input search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('projects.search')} aria-label={t('projects.search')} />
  {visible.length ? <div className="project-list">{visible.map((project) => <article className="project-row" key={project.id}><button onClick={() => open(project.id)}><strong>{project.name}</strong><span>{t('system.aio')}</span></button><button className="button button-secondary" onClick={() => setTarget(project.id)}>{t('action.remove')}</button></article>)}</div> : <section className="state-panel"><h2>{t('projects.empty')}</h2></section>}
  <ConfirmDialog open={target !== null} title={t('dialog.removeProject')} body={t('dialog.removeProjectBody')} danger onClose={() => setTarget(null)} onConfirm={remove}/><ToastRegion messages={toast ? [{ id: 'project-removed', message: toast }] : []} /></main>;
}
