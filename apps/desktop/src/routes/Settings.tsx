import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useT } from '../i18n';
import { useUi, VIBES, type Vibe } from '../store/ui';
import { useSettings, type ApplicationSettings } from '../store/settings';

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
  const { theme, setTheme, vibe, setVibe, lang, setLang, ask } = useUi();
  const settings = useSettings();
  const updateText = (key: keyof ApplicationSettings) => (event: React.ChangeEvent<HTMLInputElement>) => settings.update({ [key]: event.target.value });
  const updateNumber = (key: keyof ApplicationSettings) => (event: React.ChangeEvent<HTMLInputElement>) => { const value = Number(event.target.value); if (Number.isFinite(value)) settings.update({ [key]: value }); };
  const reset = () => ask({ title: 'Réinitialiser les réglages ?', message: 'Les préférences globales seront remplacées par les valeurs par défaut.', confirmLabel: 'Réinitialiser', danger: true, onConfirm: settings.reset });

  return (
    <div className="page">
      <TopBar back="/accueil" />
      <div className="page-body">
        <div className="page-inner">
          <h1 className="page-title">{t('home.settings')}</h1>

          <div className="kpis">
            <div className="kpi kpi-head">
              <span className="h-sec">{t('settings.interface')}</span>
            </div>
            <div className="kpi">
              <span>{t('settings.theme')}</span>
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
              <span>{t('settings.language')}</span>
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

          <SettingsGroup title="Identité société">
            <SettingInput label="Nom" value={settings.companyName} onChange={updateText('companyName')} />
            <SettingInput label="Adresse" value={settings.companyAddress} onChange={updateText('companyAddress')} />
            <SettingInput label="Téléphone" value={settings.companyPhone} onChange={updateText('companyPhone')} />
            <SettingInput label="E-mail" type="email" value={settings.companyEmail} onChange={updateText('companyEmail')} />
            <SettingInput label="Logo des rapports (URL ou chemin)" value={settings.reportLogo} onChange={updateText('reportLogo')} />
            <SettingInput label="Pied de page des rapports" value={settings.reportFooter} onChange={updateText('reportFooter')} />
          </SettingsGroup>
          <SettingsGroup title="Défauts des nouveaux projets">
            <SettingInput label="Performance ratio (%)" type="number" value={settings.performanceRatioPercent} onChange={updateNumber('performanceRatioPercent')} />
            <SettingInput label="LPSP maximale (%)" type="number" value={settings.maxLpspPercent} onChange={updateNumber('maxLpspPercent')} />
            <SettingInput label="LOLP maximale (%)" type="number" value={settings.maxLolpPercent} onChange={updateNumber('maxLolpPercent')} />
            <SettingInput label="Rendement onduleur (%)" type="number" value={settings.inverterEfficiencyPercent} onChange={updateNumber('inverterEfficiencyPercent')} />
            <SettingInput label="Rendement batterie (%)" type="number" value={settings.batteryEfficiencyPercent} onChange={updateNumber('batteryEfficiencyPercent')} />
            <SettingInput label="Tension batterie (V)" type="number" value={settings.batteryVoltage} onChange={updateNumber('batteryVoltage')} />
            <SettingInput label="Coût PV (FCFA/kWc)" type="number" value={settings.pvSpecificCost} onChange={updateNumber('pvSpecificCost')} />
            <SettingInput label="Marge PV (%)" type="number" value={settings.pvMarginPercent} onChange={updateNumber('pvMarginPercent')} />
            <SettingInput label="Coût batterie (FCFA/kWh)" type="number" value={settings.batterySpecificCost} onChange={updateNumber('batterySpecificCost')} />
            <SettingInput label="Marge batterie (%)" type="number" value={settings.batteryMarginPercent} onChange={updateNumber('batteryMarginPercent')} />
            <SettingInput label="Coût onduleur (FCFA/kW)" type="number" value={settings.inverterSpecificCost} onChange={updateNumber('inverterSpecificCost')} />
            <SettingInput label="Marge onduleur (%)" type="number" value={settings.inverterMarginPercent} onChange={updateNumber('inverterMarginPercent')} />
            <SettingInput label="TVA (%)" type="number" value={settings.vatPercent} onChange={updateNumber('vatPercent')} />
            <SettingInput label="Validité de l’offre (jours)" type="number" value={settings.offerValidityDays} onChange={updateNumber('offerValidityDays')} />
            <SettingInput label="Garantie (mois)" type="number" value={settings.warrantyMonths} onChange={updateNumber('warrantyMonths')} />
            <SettingInput label="Délai de livraison (jours)" type="number" value={settings.deliveryDays} onChange={updateNumber('deliveryDays')} />
            <SettingInput label="Remise (%)" type="number" value={settings.discountPercent} onChange={updateNumber('discountPercent')} />
            <SettingInput label="Acompte (%)" type="number" value={settings.downPaymentPercent} onChange={updateNumber('downPaymentPercent')} />
            <SettingInput label="Devise" value={settings.currencyCode} maxLength={3} onChange={updateText('currencyCode')} />
          </SettingsGroup>
          <div className="rowline"><span className="label">Ces valeurs s’appliquent uniquement aux nouveaux projets.</span><span className="sep" /><button className="btn" onClick={reset}>Valeurs par défaut</button></div>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <div className="kpis settings-group"><div className="kpi kpi-head"><span className="h-sec">{title}</span></div>{children}</div>; }
function SettingInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="kpi"><span>{label}</span><input className="cell-in settings-input" {...props} /></label>; }
