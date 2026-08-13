import { useT } from '../i18n';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';

const secondsSince = (ts: number) => Math.max(0, Math.round((Date.now() - ts) / 1000));

export function StatusBar({ currency = 'XOF' }: { currency?: string }) {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const savedAt = useProjects((state) => state.savedAt);

  return (
    <footer className="statusbar">
      <span className="simbanner" title="Aucun moteur de calcul n’est chargé">
        Calculs indisponibles · AIO-001
      </span>
      <span className="live">{t('app.saved')} il y a {secondsSince(savedAt)} s</span>
      <span>·</span>
      <span>Aucun résultat simulé</span>
      <span className="sep" />
      <span>FCFA ({currency})</span>
      <span>·</span>
      <span>{lang === 'fr' ? 'Français' : 'English'}</span>
      <span>·</span>
      <span>{t('app.offline')}</span>
    </footer>
  );
}
