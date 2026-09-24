import { useNavigate } from 'react-router-dom';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useT } from '../i18n';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { fmt, relativeTime } from '../domain/format';
import { projectProgress, studioMetrics } from '../app/models/homeMetrics';
import { useSettings } from '../store/settings';
import { readProjectResumeTarget } from '../app/navigationSession';
import type { SystemType } from '../app/models/projectView';
import schemaAllInOne from '../assets/systems/standalone-all-in-one.webp';
import schemaInverterController from '../assets/systems/standalone-inverter-controller.webp';
import schemaGridTied from '../assets/systems/grid-tied.webp';
import schemaPvDiesel from '../assets/systems/pv-diesel.webp';
import schemaStreetLight from '../assets/systems/solar-street-light.webp';
import schemaWaterPumping from '../assets/systems/solar-water-pumping.webp';

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
  const lang = useUi((s) => s.lang);
  const recentLimit = useSettings((s) => s.projects.recentProjectLimit);
  const companyName = useSettings((s) => s.company.name);

  const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const recent = sorted.slice(0, recentLimit);
  const metrics = studioMetrics(projects);
  // La dernière étude ouverte tient lieu de point d'entrée : reprendre son
  // travail est le geste le plus fréquent, il mérite la place du décor.
  const last = sorted[0] ? { project: sorted[0], progress: projectProgress(sorted[0], lang) } : null;

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
          <div className="home-hero">
            <div className="home-hero-copy">
              <span className="home-eyebrow">{t('home.welcome')}</span>
              <h1 className="home-hero-title">{t('home.heroTitle')}</h1>
              <p className="page-lead">{t('home.heroLead')}</p>
              {metrics.projects > 0 && (
                <dl className="home-figures">
                  <div><dt>{t('home.figureStudies')}</dt><dd>{metrics.projects}</dd></div>
                  <div><dt>{t('home.figureClients')}</dt><dd>{metrics.clients || '—'}</dd></div>
                  <div><dt>{t('home.figurePv')}</dt><dd>{metrics.pvKwc === null ? '—' : fmt(metrics.pvKwc, 1)}<span>kWc</span></dd></div>
                  <div><dt>{t('home.figureStorage')}</dt><dd>{metrics.storageKwh === null ? '—' : fmt(metrics.storageKwh, 1)}<span>kWh</span></dd></div>
                </dl>
              )}
            </div>

            {last ? (
              <button className="home-resume" onClick={resumeLast}>
                <span className="home-resume-tag">{t('home.resumeLast')}</span>
                <b>{last.project.name}</b>
                <small>{last.project.details.clientName || t('home.clientMissing')} · {last.project.details.projectLocation || t('home.locationMissing')}</small>
                <span className="home-meter" aria-hidden="true">
                  <i style={{ width: `${Math.round((last.progress.done / last.progress.total) * 100)}%` }} />
                </span>
                <span className="home-resume-foot">
                  <span>{last.progress.done}/{last.progress.total} {t('home.stepsDone')}</span>
                  {last.progress.nextStep && <span className="home-next">{t('ws.section.' + last.progress.nextStep)} →</span>}
                </span>
              </button>
            ) : (
              <div className="home-resume is-empty">
                <b>{t('home.noProject')}</b>
                <small>{t('home.emptyHint')}</small>
                <button className="btn btn-ok" onClick={() => start('standalone_all_in_one', true)}>{t('home.emptyCta')}</button>
              </div>
            )}
          </div>

          {!companyName.trim() && (
            <div className="alert info home-identity" role="note">
              <div>
                <b>{t('home.identityTitle')}</b> {t('home.identityLead')}
              </div>
              <button className="btn" onClick={() => nav('/reglages')}>{t('home.identityCta')}</button>
            </div>
          )}

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
            {/* Les architectures à venir tiennent en une ligne : l'accueil montre
                d'abord ce que l'on peut faire aujourd'hui. */}
            <div className="upcoming-list">
              <span className="label">{t('home.upcomingSection')} :</span>
              {SYSTEMS.filter((s) => !s.ready).map((s) => (
                <span key={s.type} className="upcoming-item" title={t('sysd.' + s.type)}>{t('sys.' + s.type)}</span>
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
                {recent.map((p) => {
                  const progress = projectProgress(p, lang);
                  return (
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
                      <span className="row-progress" title={`${progress.done}/${progress.total}`}>
                        <span className="home-meter" aria-hidden="true">
                          <i style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                        </span>
                        <small>{progress.done}/{progress.total}</small>
                      </span>
                      <span className="when">n° {p.details.projectNumber || '—'}</span>
                      <span className="when">{relativeTime(p.updatedAt, lang)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
