import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { useT } from '../i18n';
import { relativeTime } from '../domain/format';
import { ImportProjectButton, useProjectTransfer } from './ImportProjectButton';
import { useProjectCreationGuard } from '../shell/licenseGuard';

export function ProjectsRoute() {
  const t = useT(); const nav = useNavigate(); const session = useProjects(); const { projects, remove } = session; const { ask, notify, lang } = useUi();
  const [q, setQ] = useState(''); const [sort, setSort] = useState<'updated' | 'created' | 'name'>('updated');
  const transfer = useProjectTransfer();
  const needle = q.trim().toLowerCase();
  const shown = projects.filter((p) => !needle || `${p.name} ${p.details.clientName} ${p.details.projectNumber} ${p.details.projectLocation}`.toLowerCase().includes(needle)).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt));
  const guard = useProjectCreationGuard();
  const newProject = () => guard(() => { const id = session.create('standalone_all_in_one'); void nav(`/projet/${id}/atelier/projet`); });
  const duplicate = (id: string) => guard(() => { try { const copy = transfer.duplicate(id); notify({ kind: 'success', title: t('projects.duplicated') }); void nav(`/projet/${copy.id}/atelier/projet`); } catch (error) { notify({ kind: 'error', title: t('projects.duplicateFailed'), detail: error instanceof Error ? error.message : '' }); } });

  return <div className="page"><TopBar back="/accueil" primary={{ label: t('home.newProject'), onClick: newProject }} /><div className="page-body"><div className="page-inner">
    <div className="rowline"><h1 className="page-title">{t('home.allProjects')}</h1><span className="sep" /><input className="hdr-search" style={{ width: 240 }} placeholder={t('g.search')} value={q} onChange={(e) => setQ(e.target.value)} /><select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label={t('projects.sort')}><option value="updated">{t('projects.sortUpdated')}</option><option value="created">{t('projects.sortCreated')}</option><option value="name">{t('projects.sortName')}</option></select><ImportProjectButton /><span className="label">{shown.length} {t('projects.count')}</span></div>
    {shown.length === 0 ? <div className="empty"><b>{t('projects.noneFound')}</b><span>{needle ? t('projects.noMatch') : t('projects.emptyHint')}</span><button className="btn btn-ok" onClick={newProject}>{t('home.newProject')}</button></div> : <div className="proj-list">{shown.map((p) => <div key={p.id} className="proj-row"><button style={{ textAlign: 'left' }} onClick={() => nav(`/projet/${p.id}/atelier/projet`)}><b>{p.name}</b><small>{p.details.clientName || t('home.clientMissing')} · {p.details.projectLocation || t('home.locationMissing')} · n° {p.details.projectNumber || '—'}</small></button><span className="when">{relativeTime(p.updatedAt, lang)}</span><button className="btn" onClick={() => duplicate(p.id)}>{t('projects.duplicate')}</button><button className="btn" onClick={() => { void transfer.export(p.id).then(() => notify({ kind: 'success', title: t('projects.exported') })).catch((error: unknown) => notify({ kind: 'error', title: t('projects.exportFailed'), detail: error instanceof Error ? error.message : '' })); }}>{t('projects.export')}</button><button className="btn" onClick={() => ask({ title: t('projects.deleteTitle'), message: `« ${p.name} » ${t('projects.deleteMessage')}`, confirmLabel: t('g.delete'), danger: true, onConfirm: () => { const restore = remove(p.id); notify({ kind: 'success', title: t('projects.deleted'), ...(restore ? { action: { label: t('g.undo'), run: restore } } : {}) }); } })}>{t('g.delete')}</button></div>)}</div>}
  </div></div><StatusBar /></div>;
}
