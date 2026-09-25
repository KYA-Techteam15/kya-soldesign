import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { automaticCheckDue, checkForUpdate, type UpdateCheck } from '../app/platform/updates';
import { Dialog } from '../ui/Dialog';
import { fill, useT } from '../i18n';

/**
 * Recherche de mise à jour partagée : à chaque démarrage, depuis le menu ou depuis
 * Réglages. Une version disponible s'annonce dans une boîte avec ses notes (spec 012, FR-E1).
 */
interface UpdateStore {
  readonly result: UpdateCheck | 'checking' | null;
  readonly open: boolean;
  /** `manual` : la boîte s'ouvre aussi pour dire « à jour » ou l'erreur. */
  readonly run: (manual: boolean) => Promise<void>;
  readonly close: () => void;
}

export const useUpdates = create<UpdateStore>((set, get) => ({
  result: null,
  open: false,
  run: async (manual) => {
    if (get().result === 'checking') return;
    set({ result: 'checking', open: manual });
    const result = await checkForUpdate();
    set({ result, open: manual || result.status === 'available' });
  },
  close: () => set({ open: false }),
}));

export function UpdateNotice() {
  const t = useT();
  const { result, open, run, close } = useUpdates();
  const [installing, setInstalling] = useState(false);

  useEffect(() => { if (automaticCheckDue()) void run(false); }, [run]);

  if (!open || result === null) return null;
  const install = async () => {
    if (result === 'checking' || result.status !== 'available') return;
    setInstalling(true);
    try { await result.install(); } catch { setInstalling(false); }
  };

  if (result !== 'checking' && result.status === 'available') {
    return (
      <Dialog
        title={fill(t('update.availableTitle'), { version: result.version })}
        lead={t('update.availableLead')}
        onClose={close}
        footer={<>
          <button className="btn" onClick={close} disabled={installing}>{t('update.later')}</button>
          <button className="btn btn-primary" onClick={() => { void install(); }} disabled={installing}>{installing ? t('update.installing') : t('about.updateInstall')}</button>
        </>}
      >
        {result.notes ? <pre className="update-notes">{result.notes}</pre> : <p className="label">{t('update.noNotes')}</p>}
      </Dialog>
    );
  }
  return (
    <Dialog title={t('update.title')} onClose={close} footer={<button className="btn" onClick={close}>{t('dialog.fermer')}</button>}>
      <p role="status">{result === 'checking' ? t('about.updateChecking')
        : result.status === 'unconfigured' ? t('about.updateUnconfigured')
          : result.status === 'up-to-date' ? t('about.updateUpToDate')
            : `${t('about.updateError')} · ${result.message}`}</p>
    </Dialog>
  );
}
