import { useT } from '../i18n';
import { useUi } from '../store/ui';

export function StatusBar({ currency = 'XOF' }: { currency?: string }) {
  const t = useT();
  const lang = useUi((state) => state.lang);

  return (
    <footer className="statusbar">
      <span className="simbanner" title="Aucun moteur de calcul n’est chargé">
        {t('status.calculationsUnavailable')} · AIO-001
      </span>
      <span className="live">{t('status.sessionMemory')}</span>
      <span>·</span>
      <span>{t('status.noSimulation')}</span>
      <span className="sep" />
      <span>FCFA ({currency})</span>
      <span>·</span>
      <span>{lang === 'fr' ? 'Français' : 'English'}</span>
      <span>·</span>
      <span>{t('status.noPersistence')}</span>
    </footer>
  );
}
