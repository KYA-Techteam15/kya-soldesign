import { useNavigate } from 'react-router-dom';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useT } from '../i18n';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { relativeFr } from '../domain/format';
import type { SystemType } from '../app/models/projectView';
import schemaAllInOne from '../assets/systems/standalone-all-in-one.png';
import schemaInverterController from '../assets/systems/standalone-inverter-controller.png';
import schemaGridTied from '../assets/systems/grid-tied.png';
import schemaPvDiesel from '../assets/systems/pv-diesel.png';
import schemaStreetLight from '../assets/systems/solar-street-light.png';
import schemaWaterPumping from '../assets/systems/solar-water-pumping.png';

/**
 * `tone` colore le badge par famille technique : autonome, raccordé, hybride,
 * éclairage, pompage. Six badges de la même teinte ne se distinguaient que par
 * leurs trois lettres — la couleur fait le tri avant la lecture.
 *
 * `schema` porte le synoptique de l'architecture. Trois lettres et un titre ne
 * disent pas ce qui distingue deux systèmes autonomes ; le schéma le montre —
 * un seul appareil qui fait tout, ou deux appareils autour d'un parc commun.
 */
const SYSTEMS: {
  type: SystemType;
  glyph: string;
  ready: boolean;
  tone: string;
  schema?: string;
}[] = [
  {
    type: 'standalone_all_in_one',
    glyph: 'AIO',
    ready: true,
    tone: 'solar',
    schema: schemaAllInOne,
  },
  {
    type: 'standalone_inverter_controller',
    glyph: 'I+R',
    ready: false,
    tone: 'solar',
    schema: schemaInverterController,
  },
  { type: 'grid_tied', glyph: 'RES', ready: false, tone: 'grid', schema: schemaGridTied },
  { type: 'pv_diesel', glyph: 'GE', ready: false, tone: 'hybrid', schema: schemaPvDiesel },
  {
    type: 'solar_street_light',
    glyph: 'LAM',
    ready: false,
    tone: 'light',
    schema: schemaStreetLight,
  },
  {
    type: 'solar_water_pumping',
    glyph: 'PMP',
    ready: false,
    tone: 'water',
    schema: schemaWaterPumping,
  },
];

export function Home() {
  const t = useT();
  const nav = useNavigate();
  const projects = useProjects((s) => s.projects);
  const create = useProjects((s) => s.create);
  const notify = useUi((s) => s.notify);

  const recent = [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  const start = (type: SystemType, ready: boolean) => {
    if (!ready) {
      notify({
        kind: 'info',
        title: t('home.comingSoon'),
        detail: `${t(`sys.${type}`)} — non implémenté dans cette version, comme aujourd’hui.`,
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
        primary={{
          label: t('home.newProject'),
          onClick: () => start('standalone_all_in_one', true),
        }}
      />
      <div className="page-body">
        <div className="page-inner">
          <div>
            <h1 className="page-title">{t('home.welcome')}</h1>
            <p className="page-lead">{t('home.subtitle')}</p>
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
            <div className="sys-grid">
              {SYSTEMS.map((s) => (
                <button
                  key={s.type}
                  className={`sys-card ${s.schema ? 'has-schema' : ''}`}
                  disabled={!s.ready}
                  onClick={() => start(s.type, s.ready)}
                >
                  {s.schema && (
                    <img className="sys-schema" src={s.schema} alt="" aria-hidden="true" />
                  )}
                  {/* Le badge tient sur la ligne du titre : seul au-dessus, il
                      coûtait une ligne entière pour trois lettres. */}
                  <span className="sys-name">
                    <span className={`glyph g-${s.tone}`}>{s.glyph}</span>
                    <b>{t(`sys.${s.type}`)}</b>
                  </span>
                  <span className="sys-desc">{t(`sysd.${s.type}`)}</span>
                  <span className="sys-state">
                    {s.ready ? 'Disponible' : t('home.comingSoon')}
                  </span>
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
                <b>Aucun projet</b>
                Créez votre premier projet pour démarrer.
              </div>
            ) : (
              <div className="proj-list">
                {recent.map((p) => (
                  <button
                    key={p.id}
                    className="proj-row"
                    onClick={() => nav(`/projet/${p.id}/atelier/projet`)}
                  >
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.details.clientName || 'Client non renseigné'} ·{' '}
                        {p.details.projectLocation || 'Lieu non renseigné'}
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
