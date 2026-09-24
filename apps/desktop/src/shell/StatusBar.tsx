import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { useUi } from '../store/ui';
import { useProjectSession } from '../app/ProjectSessionProvider';
import { applicationReleaseInfo } from '../app/models/releaseInfo';
import { currencyLabel } from '../domain/format';

function useOnline(): boolean {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

/**
 * Barre d'état destinée à l'utilisateur : l'enregistrement (avec reprise en cas
 * d'échec), la connexion utile aux téléchargements météo, la devise et la version.
 */
export function StatusBar({ currency }: { currency?: string }) {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const { saveState, retrySave } = useProjectSession();
  const online = useOnline();
  const savedAt = saveState.lastSavedAt === null ? null : new Date(saveState.lastSavedAt).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <footer className="statusbar">
      <span className={`save-state save-${saveState.status}`} role="status" aria-live="polite">
        {saveState.status === 'error' ? (
          <>
            <b>{t('save.failed')}</b>
            <button type="button" className="linkish" onClick={retrySave}>{t('save.retry')}</button>
          </>
        ) : saveState.status === 'saving' ? t('save.saving') : savedAt ? `${t('save.saved')} · ${savedAt}` : t('save.upToDate')}
      </span>
      <span>·</span>
      <span className={online ? '' : 'offline'} title={online ? undefined : t('status.offlineHelp')}>{online ? t('status.online') : t('status.offline')}</span>
      <span className="sep" />
      {currency && <><span>{currencyLabel(currency, lang)} ({currency})</span><span>·</span></>}
      <span>{lang === 'fr' ? 'Français' : 'English'}</span>
      <span>·</span>
      <span>v{applicationReleaseInfo.version}</span>
    </footer>
  );
}
