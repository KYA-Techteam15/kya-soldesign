import { useState, type ChangeEvent } from 'react';
import { Dialog } from '../../ui/Dialog';
import { useT } from '../../i18n';
import { useSettings } from '../../store/settings';
import { reportAssetRepository, useReportAssetUrl } from '../../app/adapters/reportAssetRepository';
import {
  defaultReportOptions,
  offeredSections,
  type DocKind,
  type ReportOptions,
  type SectionId,
} from '../../app/export/documentComposition';

/**
 * Configuration au moment de générer.
 *
 * Les réglages décrivent l'entreprise, pas la pièce du jour : une offre sans
 * les prix, un tirage marqué « BROUILLON » ou un rapport en anglais pour un
 * bailleur sont des décisions ponctuelles. Elles se prennent ici, sans changer
 * les réglages de tout le monde.
 */
/**
 * Emplacement d'un visuel.
 *
 * Il montre ce qui sera réellement imprimé — pas une case à cocher — et permet
 * de le remplacer sans quitter le dialogue. Sans aperçu, on ne découvrait le
 * mauvais logo qu'une fois le document ouvert.
 */
function VisualSlot({ kind, label, assetId, onPick }: {
  readonly kind: 'logo' | 'cover';
  readonly label: string;
  readonly assetId: string | null;
  readonly onPick: (id: string | null) => void;
}) {
  const t = useT();
  const url = useReportAssetUrl(assetId);
  const [error, setError] = useState<string | null>(null);
  const fallback = kind === 'logo' ? '/kya-sol-design-logo.png' : null;
  const shown = url ?? fallback;

  const replace = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const stored = await reportAssetRepository.store(file, kind);
      onPick(stored.id);
      setError(null);
    } catch {
      setError(t('settings.assetError'));
    }
  };

  return <div className={`visual-slot visual-slot-${kind}`}>
    <span className="visual-slot-label">{label}</span>
    <span className="visual-slot-frame">
      {shown === null
        ? <span className="label">{t('generate.visualNone')}</span>
        : <img src={shown} alt={label} />}
    </span>
    <span className="visual-slot-actions">
      <label className="btn">{t('generate.visualReplace')}
        <input type="file" accept="image/png,image/jpeg,image/svg+xml" aria-label={label} hidden onChange={(event) => { void replace(event); }} />
      </label>
      {assetId !== null && <button type="button" className="btn btn-ghost" onClick={() => { void reportAssetRepository.remove(assetId).then(() => onPick(null)); }}>{t('settings.assetRemove')}</button>}
    </span>
    {error !== null && <small className="error">{error}</small>}
  </div>;
}

export function GenerateDialog({ kind, initial, confirmLabel, onCancel, onConfirm }: {
  readonly kind: DocKind;
  readonly initial: ReportOptions;
  readonly confirmLabel: string;
  readonly onCancel: () => void;
  readonly onConfirm: (options: ReportOptions) => void;
}) {
  const t = useT();
  const settings = useSettings();
  const [draft, setDraft] = useState<ReportOptions>(initial);
  const offered = offeredSections(kind);
  const chosen = new Set(draft.sections);

  const toggle = (id: SectionId) => setDraft((current) => {
    const next = new Set(current.sections);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { ...current, sections: [...next] };
  });

  // Le rappel n'apparaît que si une section confidentielle est réellement
  // retenue : un avertissement permanent cesse d'être lu.
  const confidential = offered.some((section) => section.confidential && chosen.has(section.id));

  return <Dialog
    title={t('generate.title')}
    lead={t('generate.lead')}
    onClose={onCancel}
    footer={<>
      <button className="btn btn-ghost" onClick={() => setDraft(defaultReportOptions(kind, initial.lang))}>{t('generate.reset')}</button>
      <span className="sep" />
      <button className="btn btn-ghost" onClick={onCancel}>{t('g.cancel')}</button>
      <button className="btn btn-ok" onClick={() => onConfirm(draft)}>{confirmLabel}</button>
    </>}
  >
    <div className="generate-grid">
      <fieldset className="generate-sections">
        <legend>{t('generate.sections')}</legend>
        {offered.map((section) => <label key={section.id} className={section.confidential ? 'is-confidential' : ''}>
          <input
            type="checkbox"
            checked={chosen.has(section.id)}
            disabled={section.required === true}
            onChange={() => toggle(section.id)}
          />
          <span>{t(section.labelKey)}</span>
          {section.required === true && <small className="label">{t('generate.required')}</small>}
        </label>)}
      </fieldset>

      <div className="generate-options">
        {/* Les visuels appartiennent à l'entreprise, pas au tirage du jour :
            les remplacer ici les remplace pour les quatre pièces et pour les
            dossiers suivants. C'est ce qu'on attend d'une identité. */}
        <fieldset className="generate-visuals">
          <legend>{t('generate.visuals')}</legend>
          <VisualSlot kind="logo" label={t('settings.logoFile')} assetId={settings.reports.logoAssetId}
            onPick={(id) => settings.updateCategory('reports', { logoAssetId: id })} />
          <VisualSlot kind="cover" label={t('settings.coverFile')} assetId={settings.reports.coverAssetId}
            onPick={(id) => settings.updateCategory('reports', { coverAssetId: id })} />
          <p className="label">{t('generate.visualsShared')}</p>
        </fieldset>

        <label className="generate-switch">
          <input type="checkbox" checked={draft.withPrices} onChange={(event) => setDraft((current) => ({ ...current, withPrices: event.target.checked }))} />
          <span>{t('generate.withPrices')}<small className="label">{t('generate.withPricesHelp')}</small></span>
        </label>

        <label><span>{t('generate.language')}</span>
          <select value={draft.lang} onChange={(event) => setDraft((current) => ({ ...current, lang: event.target.value as 'fr' | 'en' }))}>
            <option value="fr">{t('app.language.fr')}</option>
            <option value="en">{t('app.language.en')}</option>
          </select>
        </label>

        <label><span>{t('generate.watermark')}</span>
          <input
            value={draft.watermark}
            placeholder={t('generate.watermarkPlaceholder')}
            maxLength={24}
            onChange={(event) => setDraft((current) => ({ ...current, watermark: event.target.value }))}
          />
        </label>

        <label><span>{t('generate.fileName')}<small className="label">{t('generate.fileNameHelp')}</small></span>
          <input
            value={draft.fileName}
            onChange={(event) => setDraft((current) => ({ ...current, fileName: event.target.value }))}
          />
        </label>

        {confidential && <p className="generate-warning" role="status">{t('generate.confidentialWarning')}</p>}
      </div>
    </div>
  </Dialog>;
}
