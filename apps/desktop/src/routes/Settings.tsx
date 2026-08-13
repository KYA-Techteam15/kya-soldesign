import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useT } from '../i18n';
import { useUi, VIBES, type Vibe } from '../store/ui';

/** Les trois styles soumis à l'avis, décrits en une phrase chacun. */
const VIBE_LABEL: Record<Vibe, string> = {
  sober: 'Sobre',
  vivid: 'Vif',
  radiant: 'Éclatant',
};
const VIBE_SAY: Record<Vibe, string> = {
  sober: 'Sobre : l’instrument de mesure. Contraste et densité, rien d’autre.',
  vivid: 'Vif : la charte assumée. Chrome sombre, surfaces colorées.',
  radiant: 'Éclatant : le blanc éclairé. Profondeur, halos, un grand chiffre.',
};

export function SettingsRoute() {
  const t = useT();
  const { theme, setTheme, vibe, setVibe, lang, setLang } = useUi();

  return (
    <div className="page">
      <TopBar back="/accueil" />
      <div className="page-body">
        <div className="page-inner">
          <h1 className="page-title">{t('home.settings')}</h1>

          <div className="kpis">
            <div className="kpi kpi-head">
              <span className="h-sec">Interface</span>
            </div>
            <div className="kpi">
              <span>Thème</span>
              <span className="seg">
                <button
                  aria-selected={theme === 'light'}
                  onClick={() => setTheme('light')}
                >
                  Clair
                </button>
                <button
                  aria-selected={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                >
                  Sombre
                </button>
              </span>
            </div>
            <div className="kpi">
              <span>
                Intensité visuelle
                <br />
                <span className="label">{VIBE_SAY[vibe]}</span>
              </span>
              <span className="seg">
                {VIBES.map((v) => (
                  <button
                    key={v}
                    aria-selected={vibe === v}
                    onClick={() => setVibe(v)}
                  >
                    {VIBE_LABEL[v]}
                  </button>
                ))}
              </span>
            </div>
            <div className="kpi">
              <span>Langue</span>
              <span className="seg">
                <button aria-selected={lang === 'fr'} onClick={() => setLang('fr')}>
                  Français
                </button>
                <button aria-selected={lang === 'en'} onClick={() => setLang('en')}>
                  English
                </button>
              </span>
            </div>
          </div>

          <div className="stub">
            <b>Sections à venir en phase 4</b>
            <ul>
              <li>Société : nom, adresse, téléphone, e-mail, logo des rapports</li>
              <li>
                Défauts techniques : performance ratio, LPSP, LOLP, profondeur de
                décharge, rendements
              </li>
              <li>
                Défauts financiers : coûts spécifiques, marges, TVA, garantie, validité
              </li>
              <li>
                Fichiers : dossier d’export, intervalle d’autosauvegarde, projets récents
              </li>
              <li>Licence : activation, édition, expiration, désactivation</li>
              <li>Devise d’entrée et de sortie, taux de change</li>
              <li>À propos et version</li>
            </ul>
            <span className="tag">registre 94–102 · settings_page.py</span>
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
