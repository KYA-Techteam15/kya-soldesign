import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ProjectFileV1 } from '@ksd/project-format';
import { useApplication } from '../../app/ApplicationProvider.js';
import { StatusBar } from '../../app/shell/StatusBar.js';
import { TopBar } from '../../app/shell/TopBar.js';
import { useT, type MessageKey } from '../../shared/i18n/index.js';
import { useValidatedCopy } from '../../shared/i18n/useValidatedCopy.js';
import { workshopSteps, isWorkshopStepId, type WorkshopStepId } from './stepMetadata.js';
import { ProjectStep } from './steps/ProjectStep.js';
import { SiteStep } from './steps/SiteStep.js';
import { NeedsStep } from './steps/NeedsStep.js';
import { PresizingStep } from './steps/PresizingStep.js';
import { EquipmentStep } from './steps/EquipmentStep.js';
import { ProtectionStep } from './steps/ProtectionStep.js';
import { FinanceStep } from './steps/FinanceStep.js';
import { DossierStep } from './steps/DossierStep.js';

const questions: Record<WorkshopStepId, MessageKey> = {
  projet: 'workshop.question.project', site: 'workshop.question.site', besoins: 'workshop.question.needs', predimensionnement: 'workshop.question.presizing', materiel: 'workshop.question.equipment', protections: 'workshop.question.protections', finance: 'workshop.question.finance', dossier: 'workshop.question.dossier',
};

function StepContent({ step, project }: { readonly step: WorkshopStepId; readonly project: ProjectFileV1 }) {
  if (step === 'projet') return <ProjectStep project={project} />;
  if (step === 'site') return <SiteStep project={project} />;
  if (step === 'besoins') return <NeedsStep project={project} />;
  if (step === 'predimensionnement') return <PresizingStep project={project} />;
  if (step === 'materiel') return <EquipmentStep project={project} />;
  if (step === 'protections') return <ProtectionStep project={project} />;
  if (step === 'finance') return <FinanceStep project={project} />;
  return <DossierStep project={project} />;
}

export function WorkshopLayout() {
  const { projectId, stepId } = useParams();
  const { services, setCurrentProjectId } = useApplication();
  const navigate = useNavigate();
  const t = useT();
  const [counts, setCounts] = useState({ modules: 0, batteries: 0, inverters: 0 });
  useEffect(() => {
    let active = true;
    void services.catalog.list().then((items) => { if (!active) return; setCounts({ modules: items.filter((item) => item.kind === 'pv-module').length, batteries: items.filter((item) => item.kind === 'battery').length, inverters: items.filter((item) => item.kind === 'inverter').length }); }).catch(() => undefined);
    return () => { active = false; };
  }, [services]);
  if (!projectId) return <NotFound title={t('workshop.notFound')} />;
  if (!isWorkshopStepId(stepId)) return <NotFound title={t('route.segmentNotFound')} />;
  const project = services.projects.get(projectId);
  if (!project) return <NotFound title={t('workshop.notFound')} />;
  const index = workshopSteps.findIndex(([id]) => id === stepId);
  const previous = workshopSteps[index - 1];
  const next = workshopSteps[index + 1];
  const move = (id: WorkshopStepId) => { setCurrentProjectId(projectId); void navigate(`/projet/${projectId}/atelier/${id}`); };

  return <div className="app">
    <TopBar project={project} back="/accueil" />
    <div className="main">
      <nav className="pane pane-left" aria-label={t('workshop.file')}>
        <div className="tree-group"><h2 className="h-sec">{t('workshop.file')}</h2></div>
        <ul className="tree">{workshopSteps.map(([id, key], position) => <li key={id}><button className={`nav-item ${id === stepId ? 'on' : ''}`} aria-current={id === stepId ? 'step' : undefined} onClick={() => move(id)}><i className="st st-empty" aria-hidden="true" /><span className="nav-rank">{position + 1}</span><span className="nav-label">{t(key)}</span><span className="nav-meta">—</span></button></li>)}</ul>
        <div className="tree-group" style={{ marginTop: 16 }}><h2 className="h-sec">{t('workshop.catalogBase')}</h2></div>
        <div className="tree-sub" style={{ paddingLeft: 16 }}><div><span>{t('catalog.kind.pv-module')}</span><span>{counts.modules}</span></div><div><span>{t('catalog.kind.battery')}</span><span>{counts.batteries}</span></div><div><span>{t('catalog.kind.inverter')}</span><span>{counts.inverters}</span></div></div>
      </nav>
      <main className="pane pane-center pinned">
        <div className="sheet work-card">
          <div className="stephead"><div className="stephead-top"><span className="stepbadge">{index + 1} <i>/</i> {workshopSteps.length}</span><h1 className="h-page">{t(workshopSteps[index]![1])}</h1><span className="sep" /></div><p className="stephead-q">{t(questions[stepId])}</p></div>
          <StepContent step={stepId} project={project} />
        </div>
        <div className="stepnext"><span className="stepnext-where">{t('workshop.stepOf')} {index + 1} / {workshopSteps.length} · {t(workshopSteps[index]![1])}</span>{previous ? <button className="btn btn-ghost" onClick={() => move(previous[0])}>← {t(previous[1])}</button> : null}{next ? <button className="btn btn-primary" onClick={() => move(next[0])}>{t('workshop.continueTo')} {t(next[1])} →</button> : null}</div>
      </main>
      <TruthRail />
    </div>
    <StatusBar />
  </div>;
}

function TruthRail() {
  const t = useT();
  const v = useValidatedCopy();
  return <aside className="pane pane-right">
    <div className="verdict is-wait"><div className="verdict-head"><h2 className="h-sec">{v('viability')}</h2></div><p className="verdict-say">{t('workshop.verdictWaiting')}</p></div>
    <div className="dayb"><div className="dayb-head"><h2 className="h-sec">{v('dailyProfile')}</h2></div><p className="dayb-none">{t('workshop.profileWaiting')}</p><div className="dayb-stats"><span><b>—</b><i>{v('peak')}</i></span><span><b>—</b><i>{v('energy')}</i></span><span><b>—</b><i>{v('hoursMetric')}</i></span><span><b>—</b><i>{v('sun')}</i></span></div></div>
    <div className="kpis kpis-all"><div className="kpi kpi-head"><span className="h-sec">{t('state.unavailable')}</span></div><div className="kpi"><span>{t('workshop.presizing')}</span><span className="badge warn">{'AIO-001'}</span></div><div className="kpi"><span>{v('hourlyReliability')}</span><span className="badge warn">{'SIM-001'}</span></div><div className="kpi"><span>{v('compatibility')}</span><span className="badge warn">{'EQP-001'}</span></div><div className="kpi"><span>{v('protections')}</span><span className="badge warn">{'SAFE-001'}</span></div><div className="kpi"><span>{v('finance')}</span><span className="badge warn">{'FIN-001'}</span></div></div>
  </aside>;
}

function NotFound({ title }: { readonly title: string }) {
  const t = useT();
  return <div className="page"><TopBar back="/accueil" /><main className="page-body"><div className="page-inner"><div className="empty" role="status"><b>{title}</b>{t('route.notFoundBody')}<Link className="linkish" to="/accueil/projets">{t('workshop.backToProjects')}</Link></div></div></main><StatusBar /></div>;
}
