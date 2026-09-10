import { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { useT } from '../../i18n';
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
export function GenerateDialog({ kind, initial, confirmLabel, onCancel, onConfirm }: {
  readonly kind: DocKind;
  readonly initial: ReportOptions;
  readonly confirmLabel: string;
  readonly onCancel: () => void;
  readonly onConfirm: (options: ReportOptions) => void;
}) {
  const t = useT();
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
