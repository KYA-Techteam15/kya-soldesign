import { useNavigate } from 'react-router-dom';
import { useApplication } from '../../app/ApplicationProvider.js';
import { useT } from '../../shared/i18n/index.js';
import gridTied from '../../assets/systems/grid-tied.png';
import pvDiesel from '../../assets/systems/pv-diesel.png';
import streetLight from '../../assets/systems/solar-street-light.png';
import waterPumping from '../../assets/systems/solar-water-pumping.png';
import allInOne from '../../assets/systems/standalone-all-in-one.png';
import controller from '../../assets/systems/standalone-inverter-controller.png';

const systems = [
  ['system.aio', 'system.aio.description', allInOne, true],
  ['system.controller', 'system.comingSoon', controller, false],
  ['system.grid', 'system.comingSoon', gridTied, false],
  ['system.diesel', 'system.comingSoon', pvDiesel, false],
  ['system.light', 'system.comingSoon', streetLight, false],
  ['system.pump', 'system.comingSoon', waterPumping, false],
] as const;

export function HomePage() {
  const t = useT(); const navigate = useNavigate(); const { createProject, setCurrentProjectId, projects } = useApplication();
  const create = () => { const project = createProject(); setCurrentProjectId(project.id); void navigate(`/projet/${project.id}/atelier/projet`); };
  return <main className="main-content"><header className="page-head"><p className="eyebrow">KYA SOLAR ENGINEERING</p><h1>{t('home.title')}</h1><p>{t('home.lede')}</p></header>
    <section aria-labelledby="systems-title"><div className="section-heading"><h2 id="systems-title">{t('home.systems')}</h2><span>{t('app.sessionOnly')}</span></div><div className="system-grid">{systems.map(([name, description, image, enabled]) => <article className="system-card" key={name}><img src={image} alt="" /><div><h3>{t(name)}</h3><p>{t(description)}</p></div>{enabled ? <button className="button button-primary" onClick={create}>{t('action.create')}</button> : <button className="button button-secondary" disabled>{t('system.comingSoon')}</button>}</article>)}</div></section>
    <section className="recent-section" aria-labelledby="recent-title"><div className="section-heading"><h2 id="recent-title">{t('home.recent')}</h2>{projects.length ? <button className="text-button" onClick={() => navigate('/accueil/projets')}>{t('nav.projects')}</button> : null}</div>{projects.length ? <div className="project-list">{projects.slice(0, 3).map((project) => <button className="project-row" key={project.id} onClick={() => navigate(`/projet/${project.id}/atelier/projet`)}><strong>{project.name}</strong><span>{t('system.aio')}</span></button>)}</div> : <section className="state-panel"><h2>{t('home.emptyProjects')}</h2><p>{t('home.emptyProjectsHelp')}</p></section>}</section>
  </main>;
}
