import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ProjectFileV1 } from '@ksd/project-format';
import { useApplication } from '../../app/ApplicationProvider.js';
import { useT } from '../../shared/i18n/index.js';
import { workshopSteps, isWorkshopStepId, type WorkshopStepId } from './stepMetadata.js';
import { ProjectStep } from './steps/ProjectStep.js';
import { SiteStep } from './steps/SiteStep.js';
import { NeedsStep } from './steps/NeedsStep.js';
import { PresizingStep } from './steps/PresizingStep.js';
import { EquipmentStep } from './steps/EquipmentStep.js';
import { ProtectionStep } from './steps/ProtectionStep.js';
import { FinanceStep } from './steps/FinanceStep.js';
import { DossierStep } from './steps/DossierStep.js';

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
  if (!projectId) return <NotFound title={t('workshop.notFound')} />;
  if (!isWorkshopStepId(stepId)) return <NotFound title={t('route.segmentNotFound')} />;
  const project = services.projects.get(projectId);
  if (!project) return <NotFound title={t('workshop.notFound')} />;
  const index = workshopSteps.findIndex(([id]) => id === stepId);
  const previous = workshopSteps[index - 1]?.[0];
  const next = workshopSteps[index + 1]?.[0];
  const move = (id: WorkshopStepId) => { setCurrentProjectId(projectId); void navigate(`/projet/${projectId}/atelier/${id}`); };
  return <main className="workshop"><aside className="workshop-rail"><Link className="back-link" to="/accueil/projets">← {t('workshop.backToProjects')}</Link><p className="eyebrow">{t('workshop.title')}</p><h1>{project.name}</h1><nav aria-label={t('workshop.file')}>{workshopSteps.map(([id, key], position) => <button key={id} className={id === stepId ? 'rail-step active' : 'rail-step'} aria-current={id === stepId ? 'step' : undefined} onClick={() => move(id)}><span>{String(position + 1).padStart(2, '0')}</span>{t(key)}</button>)}</nav></aside><section className="workshop-content"><header className="workshop-head"><p className="eyebrow">{String(index + 1).padStart(2, '0')} / 08</p><h1>{t(workshopSteps[index]![1])}</h1></header><StepContent step={stepId} project={project} /><footer className="workshop-actions">{previous ? <button className="button button-secondary" onClick={() => move(previous)}>{t('workshop.previous')}</button> : <span />}{next ? <button className="button button-primary" onClick={() => move(next)}>{t('workshop.next')}</button> : null}</footer></section></main>;
}

function NotFound({ title }: { readonly title: string }) {
  const t = useT();
  return <main className="main-content"><section className="state-panel not-found" role="status"><h1>{title}</h1><p>{t('route.notFoundBody')}</p><Link className="button button-secondary inline-action" to="/accueil/projets">{t('workshop.backToProjects')}</Link></section></main>;
}
