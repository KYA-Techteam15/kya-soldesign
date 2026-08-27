import { useNavigate } from 'react-router-dom';
import { useApplication } from '../../app/ApplicationProvider.js';
import { TopBar } from '../../app/shell/TopBar.js';
import { StatusBar } from '../../app/shell/StatusBar.js';
import { useT } from '../../shared/i18n/index.js';
import gridTied from '../../assets/systems/grid-tied.png';
import pvDiesel from '../../assets/systems/pv-diesel.png';
import streetLight from '../../assets/systems/solar-street-light.png';
import waterPumping from '../../assets/systems/solar-water-pumping.png';
import allInOne from '../../assets/systems/standalone-all-in-one.png';
import controller from '../../assets/systems/standalone-inverter-controller.png';

const systems = [
  ['system.aio', 'system.aio.description', allInOne, true],
  ['system.controller', 'system.controller.description', controller, false],
  ['system.grid', 'system.grid.description', gridTied, false],
  ['system.diesel', 'system.diesel.description', pvDiesel, false],
  ['system.light', 'system.light.description', streetLight, false],
  ['system.pump', 'system.pump.description', waterPumping, false],
] as const;

export function HomePage() {
  const t = useT(); const navigate = useNavigate(); const { createProject, setCurrentProjectId, projects } = useApplication();
  const create = () => { const project = createProject(); setCurrentProjectId(project.id); void navigate(`/projet/${project.id}/atelier/projet`); };
  return <div className="page page-home">
    <TopBar primary={{ label: t('app.newProject'), onClick: create }} />
    <main className="page-body"><div className="page-inner">
      <div><h1 className="page-title">{t('home.title')}</h1><p className="page-lead">{t('home.lede')}</p></div>
      <section aria-labelledby="systems-title">
        <div className="rowline" style={{ marginBottom: 8 }}><h2 className="h-sec" id="systems-title">{t('home.systems')}</h2><span className="sep" /><button className="btn" onClick={() => navigate('/catalogue')}>{t('nav.catalog')}</button><button className="btn" onClick={() => navigate('/reglages')}>{t('nav.settings')}</button></div>
        <div className="sys-grid">{systems.map(([name, description, image, enabled]) => <button key={name} className="sys-card has-schema" disabled={!enabled} onClick={enabled ? create : undefined} aria-describedby={`${name}-description`}>
          <img className="sys-schema" src={image} alt="" aria-hidden="true" />
          <span className="sys-name"><b>{t(name)}</b></span>
          <span className="sys-desc" id={`${name}-description`}>{t(description)}</span><span className="sys-state">{enabled ? 'Disponible' : t('system.comingSoon')}</span>
        </button>)}</div>
      </section>
      <section aria-labelledby="recent-title">
        <div className="rowline" style={{ marginBottom: 8 }}><h2 className="h-sec" id="recent-title">{t('home.recent')}</h2><span className="sep" /><button className="linkish" onClick={() => navigate('/accueil/projets')}>{t('nav.projects')} →</button></div>
        {projects.length ? <div className="proj-list">{projects.slice(0, 4).map((project) => <button className="proj-row" key={project.id} onClick={() => navigate(`/projet/${project.id}/atelier/projet`)}><span><b>{project.name}</b><small>{t('system.aio')}</small></span><span className="when">{project.id.slice(0, 8)}</span></button>)}</div> : <div className="empty"><b>{t('home.emptyProjects')}</b>{t('home.emptyProjectsHelp')}</div>}
      </section>
    </div></main>
    <StatusBar />
  </div>;
}
