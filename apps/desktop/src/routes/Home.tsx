import { useNavigate } from 'react-router-dom';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useT } from '../i18n';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { relativeFr } from '../domain/format';
import { useSettings } from '../store/settings';
import { readProjectResumeTarget } from '../app/navigationSession';
import type { SystemType } from '../app/models/projectView';
import schemaAllInOne from '../assets/systems/standalone-all-in-one.png';
import schemaInverterController from '../assets/systems/standalone-inverter-controller.png';
import schemaGridTied from '../assets/systems/grid-tied.png';
import schemaPvDiesel from '../assets/systems/pv-diesel.png';
import schemaStreetLight from '../assets/systems/solar-street-light.png';
import schemaWaterPumping from '../assets/systems/solar-water-pumping.png';

/**
 * `schema` porte le synoptique de l'architecture. Le visuel complète le titre et
 * montre ce qui distingue deux systèmes autonomes —
 * un seul appareil qui fait tout, ou deux appareils autour d'un parc commun.
 */
const SYSTEMS: {
  type: SystemType;
  ready: boolean;
  schema?: string;
}[] = [
  {
    type: 'standalone_all_in_one',
    ready: true,
    schema: schemaAllInOne,
  },
  {
    type: 'standalone_inverter_controller',
    ready: false,
    schema: schemaInverterController,
  },
  { type: 'grid_tied', ready: false, schema: schemaGridTied },
  { type: 'pv_diesel', ready: false, schema: schemaPvDiesel },
  {
    type: 'solar_street_light',
    ready: false,
    schema: schemaStreetLight,
  },
  {
    type: 'solar_water_pumping',
    ready: false,
    schema: schemaWaterPumping,
  },
];

export function Home() {
  const t = useT();
  const nav = useNavigate();
  const projects = useProjects((s) => s.projects);
  const create = useProjects((s) => s.create);
  const notify = useUi((s) => s.notify);
  const recentLimit = useSettings((s) => s.projects.recentProjectLimit);

  const recent = [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, recentLimit);

  const resumeLast = () => {
    const project = recent[0];
    if (project) void nav(readProjectResumeTarget(project.id) ?? `/projet/${project.id}/atelier/projet`);
  };

  const start = (type: SystemType, ready: boolean) => {
    if (!ready) {
      notify({
        kind: 'info',
        title: t('home.comingSoon'),
        detail: `${t(`sys.${type}`)} — ${t('home.unavailableDetail')}`,
      });
      return;
    }
    const id = create(type);
    void nav(`/projet/${id}/atelier/projet`);
  };

  return (
    // `page-home` isole l'accueil : c'est le seul écran autorisé à en faire
    // beaucoup. L'atelier, où l'on passe la journée, reste calme.
    <div className="page page-home">
      <TopBar
        secondary={{ label: t('home.recent'), badge: String(projects.length), onClick: () => nav('/accueil/projets'), title: t('home.allProjects') }}
        primary={{
          label: t('home.newProject'),
          onClick: () => start('standalone_all_in_one', true),
        }}
      />
      <div className="page-body">
        <div className="page-inner">
          <div>
            <div className="home-hero">
              <div>
                <h1 className="page-title">{t('home.welcome')}</h1>
                <h2 className="home-hero-title">{t('home.heroTitle')}</h2>
                <p className="page-lead">{t('home.heroLead')}</p>
                {recent[0] && <button className="btn btn-ok" onClick={resumeLast}>{t('home.resumeLast')}</button>}
              </div>
              <div className="home-hero-mark" aria-hidden="true"><span>◎</span><i /></div>
            </div>
          </div>

          <section>
            <div className="rowline" style={{ marginBottom: 8 }}>
              <h2 className="h-sec">{t('home.systems')}</h2>
              <span className="sep" />
              <button className="btn" onClick={() => nav('/catalogue')}>
                {t('home.catalog')}
              </button>
              <button className="btn" onClick={() => nav('/reglages')}>
                {t('home.settings')}
              </button>
            </div>
            <h3 className="h-sec">{t('home.availableSection')}</h3>
            <div className="sys-grid">
              {SYSTEMS.filter((s) => s.ready).map((s) => (
                <button
                  key={s.type}
                  className={`sys-card ${s.schema ? 'has-schema' : ''}`}
                  disabled={!s.ready}
                  onClick={() => start(s.type, s.ready)}
                >
                  {s.schema && (
                    <img className="sys-schema" src={s.schema} alt="" aria-hidden="true" />
                  )}
                  <span className="sys-name"><b>{t(`sys.${s.type}`)}</b></span>
                  <span className="sys-desc">{t(`sysd.${s.type}`)}</span>
                  <span className="sys-state">
                    {s.ready ? t('home.available') : t('home.comingSoon')}
                  </span>
                </button>
              ))}
            </div>
            <h3 className="h-sec upcoming-title">{t('home.upcomingSection')}</h3>
            <p className="label">{t('home.roadmapHint')}</p>
            <div className="sys-grid">
              {SYSTEMS.filter((s) => !s.ready).map((s) => (
                <button key={s.type} className={'sys-card ' + (s.schema ? 'has-schema' : '')} disabled>
                  {s.schema && <img className="sys-schema" src={s.schema} alt="" aria-hidden="true" />}
                  <span className="sys-name"><b>{t('sys.' + s.type)}</b></span>
                  <span className="sys-desc">{t('sysd.' + s.type)}</span>
                  <span className="sys-state">{t('home.comingSoon')}</span>
                </button>
              ))}
            </div>
          </section>


          <section>
            <div className="rowline" style={{ marginBottom: 8 }}>
              <h2 className="h-sec">{t('home.recent')}</h2>
              <span className="sep" />
              <button className="linkish" onClick={() => nav('/accueil/projets')}>
                {t('home.allProjects')} →
              </button>
            </div>
            {recent.length === 0 ? (
              <div className="empty">
                <b>{t('home.noProject')}</b>
                <span>{t('home.emptyHint')}</span>
                <button className="btn btn-ok" onClick={() => start('standalone_all_in_one', true)}>{t('home.emptyCta')}</button>
              </div>
            ) : (
              <div className="proj-list">
                {recent.map((p) => (
                  <button
                    key={p.id}
                    className="proj-row"
                    onClick={() => nav(readProjectResumeTarget(p.id) ?? `/projet/${p.id}/atelier/projet`)}
                  >
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.details.clientName || t('home.clientMissing')} ·{' '}
                        {p.details.projectLocation || t('home.locationMissing')}
                      </small>
                    </span>
                    <span className="when">n° {p.details.projectNumber || '—'}</span>
                    <span className="when">{relativeFr(p.updatedAt)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
