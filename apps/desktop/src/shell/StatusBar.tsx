import { useT } from '../i18n';
import { ENGINE_IS_SIMULATED } from '../engine';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';

const secondsSince = (ts: number) => Math.max(0, Math.round((Date.now() - ts) / 1000));

export function StatusBar({ currency = 'XOF' }: { currency?: string }) {
  const t = useT();
  const lang = useUi((s) => s.lang);
  const savedAt = useProjects((s) => s.savedAt);
  const computeMs = useUi((s) => s.lastComputeMs);

  return (
    <footer className="statusbar">
      {ENGINE_IS_SIMULATED && (
        <span className="simbanner" title={t('app.simulated')}>
          {t('app.simulated')}
        </span>
      )}
      <span className="live">
        {t('app.saved')} il y a {secondsSince(savedAt)} s
      </span>
      <span>·</span>
      <span title="Durée réelle du dernier passage du moteur">
        {t('app.recalculated')} en {computeMs < 1 ? '< 1' : computeMs.toFixed(0)} ms
      </span>
      <span className="sep" />
      <span>FCFA ({currency})</span>
      <span>·</span>
      <span>{lang === 'fr' ? 'Français' : 'English'}</span>
      <span>·</span>
      <span>{t('app.offline')}</span>
    </footer>
  );
}
