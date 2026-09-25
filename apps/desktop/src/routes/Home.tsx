import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useT } from '../i18n';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { relativeTime } from '../domain/format';
import { WORKSHOP_STEPS, projectProgress } from '../app/models/homeMetrics';
import { useSettings } from '../store/settings';
import { latestVersion, matchesFilter, nextVersionNumber, projectStatus, type ProjectFilter, type ProjectStatus } from '../app/models/projectLifecycle';
import type { ProjectViewModel } from '../app/models/projectView';
import { useStaleProjects, type Staleness } from '../app/calculation/useStaleProjects';
import { CanonicalCatalog } from '../app/adapters/canonicalCatalog';
import { createExampleProject } from '../app/services/exampleProject';
import { ImportProjectButton } from './ImportProjectButton';
import { useProjectCreationGuard } from '../shell/licenseGuard';
import { SystemsShowcase } from './home/SystemsShowcase';

const STEP_ORDER: readonly string[] = [...WORKSHOP_STEPS, 'dossier'];
const FILTERS: readonly ProjectFilter[] = ['all', 'in-progress', 'ready', 'issued', 'stale'];
const STATUS_TONE: Record<ProjectStatus, string> = { draft: '', 'in-progress': '', revision: 'warn', ready: 'ok', issued: 'ok' };

interface Row {
  readonly project: ProjectViewModel;
  readonly progress: ReturnType<typeof projectProgress>;
  readonly status: ProjectStatus;
  readonly stale: Staleness | null;
}

/**
 * Accueil (spec 011, FR-004 → FR-007). Premier lancement : trois gestes pour démarrer. Ensuite :
 * reprendre le dernier dossier là où il attend, et retrouver chaque projet par son état.
 */
export function Home() {
  const t = useT();
  const nav = useNavigate();
  const projects = useProjects((s) => s.projects);
  const create = useProjects((s) => s.create);
  const addCanonical = useProjects((s) => s.addCanonical);
  const { notify } = useUi();
  const lang = useUi((s) => s.lang);
  const companyName = useSettings((s) => s.company.name);
  const stale = useStaleProjects(projects);
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [query, setQuery] = useState('');
  const [preparingExample, setPreparingExample] = useState(false);

  const rows = useMemo<Row[]>(() => [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((project) => {
      const progress = projectProgress(project, lang);
      return { project, progress, status: projectStatus(project, progress), stale: stale.get(project.id) ?? null };
    }), [lang, projects, stale]);

  const guard = useProjectCreationGuard();
  const newProject = () => guard(() => { void nav(`/projet/${create('standalone_all_in_one')}/atelier/projet`); });
  const openExample = () => guard(() => { void prepareExample(); });
  const prepareExample = async () => {
    setPreparingExample(true);
    try {
      const catalog = new CanonicalCatalog();
      const [localities, weatherSources, weatherFiles, loadProfiles, equipment] = await Promise.all([catalog.listLocalities(), catalog.listWeatherSources(), catalog.listWeatherFiles(), catalog.listLoadProfiles(), catalog.list()]);
      const file = await createExampleProject({ localities, weatherSources, weatherFiles, loadProfiles, equipment }, useSettings.getState(), lang);
      addCanonical(file);
      void nav(`/projet/${file.id}/atelier/projet`);
    } catch (error) {
      notify({ kind: 'error', title: t('home.exampleFailed'), detail: error instanceof Error ? error.message : '' });
    } finally {
      setPreparingExample(false);
    }
  };
  const exampleButton = (className: string, label: string) => (
    <button className={className} disabled={preparingExample} onClick={openExample}>{preparingExample ? t('home.examplePreparing') : label}</button>
  );

  if (projects.length === 0) {
    return (
      <div className="page page-home">
        <TopBar secondary={{ label: t('home.recent'), badge: '0', onClick: () => nav('/accueil/projets'), title: t('home.allProjects') }} primary={{ label: t('home.newProject'), onClick: newProject }} />
        <div className="page-body"><div className="page-inner">
          <h1 className="page-title">{t('home.firstTitle')}</h1>
          <p className="page-lead">{t('home.firstLead')}</p>
          <div className="home-start">
            <article className="home-start-card">
              <span className="home-start-rank">1</span>
              <h2>{t('home.startCompany')}</h2>
              <p>{companyName.trim() ? t('home.startCompanyDone').replace('{name}', companyName.trim()) : t('home.startCompanyLead')}</p>
              <button className="btn" onClick={() => nav('/reglages')}>{t('home.startCompanyCta')}</button>
            </article>
            <article className="home-start-card">
              <span className="home-start-rank">2</span>
              <h2>{t('home.startExample')}</h2>
              <p>{t('home.startExampleLead')}</p>
              {exampleButton('btn', t('home.startExampleCta'))}
            </article>
            <article className="home-start-card is-primary">
              <span className="home-start-rank">3</span>
              <h2>{t('home.startNew')}</h2>
              <p>{t('sys.standalone_all_in_one')}</p>
              <button className="btn btn-primary" onClick={newProject}>{t('home.startNewCta')}</button>
            </article>
          </div>
          <p className="home-import">{t('home.importLead')} <ImportProjectButton label={t('home.importCta')} /></p>
          <SystemsShowcase />
        </div></div>
        <StatusBar />
      </div>
    );
  }

  const last = rows[0]!;
  const target = resumeStep(last);
  const needle = query.trim().toLocaleLowerCase();
  const shown = rows.filter((row) => matchesFilter(row.status, row.stale !== null, filter)
    && (!needle || `${row.project.name} ${row.project.details.clientName} ${row.project.details.projectNumber} ${row.project.details.projectLocation}`.toLocaleLowerCase().includes(needle)));
  const count = (candidate: ProjectFilter) => rows.filter((row) => matchesFilter(row.status, row.stale !== null, candidate)).length;
  const statusLabel = (row: Row) => {
    if (row.stale !== null && row.status !== 'issued') return t('home.status.stale');
    const version = row.status === 'issued' ? latestVersion(row.project)?.number : nextVersionNumber(row.project);
    return t(`home.status.${row.status}`).replace('{n}', String(version ?? 1));
  };

  return (
    <div className="page page-home">
      <TopBar secondary={{ label: t('home.recent'), badge: String(projects.length), onClick: () => nav('/accueil/projets'), title: t('home.allProjects') }} primary={{ label: t('home.newProject'), onClick: newProject }} />
      <div className="page-body"><div className="page-inner">
        <h1 className="page-title">{t('home.dashboardTitle')}</h1>
        {!companyName.trim() && (
          <div className="alert info home-identity" role="note">
            <div><b>{t('home.identityTitle')}</b> {t('home.identityLead')}</div>
            <button className="btn" onClick={() => nav('/reglages')}>{t('home.identityCta')}</button>
          </div>
        )}

        <section className="home-resume-card" aria-labelledby="home-resume-title">
          <span className="home-resume-tag">{t('home.resume')}</span>
          <h2 id="home-resume-title">{last.project.name}</h2>
          <small>{[last.project.details.clientName, last.project.details.projectNumber].filter(Boolean).join(' · ') || t('home.clientMissing')}</small>
          <span className="home-meter" aria-hidden="true"><i style={{ width: `${Math.round((last.progress.done / last.progress.total) * 100)}%` }} /></span>
          <span className="home-resume-foot">
            <span>{last.progress.done}/{last.progress.total} {t('home.stepsDone')} · {statusLabel(last)}</span>
            <span>{t('home.modified')} {relativeTime(last.project.updatedAt, lang)}</span>
          </span>
          {last.stale !== null && last.status !== 'issued' && <p className="home-stale">⚠ {t(last.stale === 'presizing' ? 'home.stalePresizing' : 'home.staleSizing')}</p>}
          <button className="btn btn-primary" onClick={() => nav(`/projet/${last.project.id}/atelier/${target}`)}>
            {t('home.continueAt').replace('{n}', String(STEP_ORDER.indexOf(target) + 1)).replace('{step}', t(`ws.section.${target}`))}
          </button>
        </section>

        <section className="home-projects" aria-labelledby="home-projects-title">
          <div className="rowline">
            <h2 className="h-sec" id="home-projects-title">{t('home.projects')}</h2>
            <div className="seg home-filters" role="group" aria-label={t('home.filters')}>
              {FILTERS.map((item) => (
                <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{t(`home.filter.${item}`)} <span className="label">{count(item)}</span></button>
              ))}
            </div>
            <span className="sep" />
            <input className="hdr-search" placeholder={t('g.search')} aria-label={t('g.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
            <button className="linkish" onClick={() => nav('/accueil/projets')}>{t('home.allProjects')} →</button>
          </div>
          {shown.length === 0
            ? <div className="empty"><b>{t('projects.noneFound')}</b><span>{t('projects.noMatch')}</span></div>
            : (
              <div className="tbl-wrap">
                <table className="tbl home-table">
                  <thead><tr><th>{t('home.col.project')}</th><th>{t('home.col.status')}</th><th className="num">{t('home.col.step')}</th><th className="when">{t('home.col.modified')}</th></tr></thead>
                  <tbody>
                    {shown.map((row) => (
                      <tr key={row.project.id}>
                        <td>
                          <Link className="home-open" to={`/projet/${row.project.id}/atelier/${resumeStep(row)}`}>{row.project.name}</Link>
                          <small>{[row.project.details.clientName, row.project.details.projectLocation].filter(Boolean).join(' · ') || '—'}</small>
                        </td>
                        <td><span className={`badge ${row.stale !== null && row.status !== 'issued' ? 'warn' : STATUS_TONE[row.status]}`}>{statusLabel(row)}</span></td>
                        <td className="num">{row.progress.done}/{row.progress.total}</td>
                        <td className="when">{relativeTime(row.project.updatedAt, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          <div className="rowline home-foot">
            <ImportProjectButton />
            {exampleButton('btn', t('home.exampleCta'))}
          </div>
        </section>
        <SystemsShowcase />
      </div></div>
      <StatusBar />
    </div>
  );
}

/** Où reprendre : le calcul à relancer d'abord, sinon la première étape non terminée. */
function resumeStep(row: Row): string {
  if (row.status === 'issued') return 'dossier';
  if (row.stale === 'presizing') return 'hypotheses';
  if (row.stale === 'sizing') return 'materiel';
  return row.progress.nextStep ?? 'dossier';
}
