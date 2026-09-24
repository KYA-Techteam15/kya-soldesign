import { useT } from '../../i18n';
import type { SystemType } from '../../app/models/projectView';
import schemaAllInOne from '../../assets/systems/standalone-all-in-one.webp';
import schemaInverterController from '../../assets/systems/standalone-inverter-controller.webp';
import schemaGridTied from '../../assets/systems/grid-tied.webp';
import schemaPvDiesel from '../../assets/systems/pv-diesel.webp';
import schemaStreetLight from '../../assets/systems/solar-street-light.webp';
import schemaWaterPumping from '../../assets/systems/solar-water-pumping.webp';

type Architecture = Exclude<SystemType, 'undefined'>;

const SCHEMAS: Record<Architecture, string> = {
  standalone_all_in_one: schemaAllInOne,
  standalone_inverter_controller: schemaInverterController,
  grid_tied: schemaGridTied,
  pv_diesel: schemaPvDiesel,
  solar_street_light: schemaStreetLight,
  solar_water_pumping: schemaWaterPumping,
};
const AVAILABLE: Architecture = 'standalone_all_in_one';
const UPCOMING: readonly Architecture[] = ['standalone_inverter_controller', 'grid_tied', 'pv_diesel', 'solar_street_light', 'solar_water_pumping'];

/**
 * Architectures (FR-006) : le système qui fonctionne aujourd'hui est montré avec son schéma ; les
 * architectures à venir tiennent sur une ligne et montrent leur schéma au survol ou au focus
 * clavier, sans se présenter comme des parcours disponibles.
 */
export function SystemsShowcase() {
  const t = useT();
  const name = t(`sys.${AVAILABLE}`);
  return (
    <section className="home-systems" aria-labelledby="home-systems-title">
      <h2 className="h-sec" id="home-systems-title">{t('home.architecturesTitle')}</h2>
      <div className="home-system-main">
        <img className="home-system-schema" src={SCHEMAS[AVAILABLE]} alt={t('home.schemaOf').replace('{name}', name)} />
        <div className="home-system-copy">
          <span className="badge ok">{t('home.available')}</span>
          <b>{name}</b>
          <p>{t(`sysd.${AVAILABLE}`)}</p>
        </div>
      </div>
      <div className="home-upcoming">
        <span className="label">{t('home.upcomingSection')} :</span>
        {UPCOMING.map((type) => (
          <span key={type} className="upcoming-chip" tabIndex={0} aria-describedby={`upcoming-${type}`}>
            {t(`sys.${type}`)}
            <span className="upcoming-preview" role="tooltip" id={`upcoming-${type}`}>
              <img src={SCHEMAS[type]} alt="" />
              <span>{t(`sysd.${type}`)}</span>
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
