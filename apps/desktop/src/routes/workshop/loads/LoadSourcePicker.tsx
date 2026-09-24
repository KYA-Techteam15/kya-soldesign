import { LOAD_SOURCE_KEYS, type LoadSourceKey } from '../../../app/models/loadSources';
import { useT } from '../../../i18n';

const ICONS: Record<LoadSourceKey, string> = { equipments: '▤', hourly: '∿', composed: '▦', annual: '⤓', meter: '▭' };

/**
 * « De quoi disposez-vous ? » : l'étape vide part de ce que l'utilisateur a entre les mains, pas
 * de la forme des données. L'année composée y figure au même rang que les autres, avec sa raison.
 */
export function LoadSourceChooser({ onChoose }: { readonly onChoose: (source: LoadSourceKey) => void }) {
  const t = useT();
  return (
    <section className="source-chooser" aria-labelledby="source-chooser-title">
      <h2 className="h-sec" id="source-chooser-title">{t('loads.source.question')}</h2>
      <div className="source-cards">
        {LOAD_SOURCE_KEYS.map((key) => (
          <button type="button" key={key} className="source-card" onClick={() => onChoose(key)}>
            <span className="source-icon" aria-hidden="true">{ICONS[key]}</span>
            <b>{t(`loads.source.${key}.have`)}</b>
            <span>{t(`loads.source.${key}.detail`)}</span>
            <span className="source-go">{t(`loads.source.${key}.action`)} →</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * Barre des sources, toujours visible. Changer de source ne supprime rien : chaque source garde
 * ses données, et seule la source active sert aux calculs.
 */
export function LoadSourceBar({ active, onChoose }: { readonly active: LoadSourceKey; readonly onChoose: (source: LoadSourceKey) => void }) {
  const t = useT();
  return (
    <div className="seg source-bar" role="tablist" aria-label={t('loads.source.bar')}>
      {LOAD_SOURCE_KEYS.map((key) => (
        <button type="button" key={key} role="tab" aria-selected={active === key} onClick={() => onChoose(key)}>{t(`loads.source.${key}.tab`)}</button>
      ))}
    </div>
  );
}
