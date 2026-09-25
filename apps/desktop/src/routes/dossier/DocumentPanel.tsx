import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectViewModel } from '../../app/models/projectView';
import { useT } from '../../i18n';
import { useProjects } from '../../store/project';
import { useSettings } from '../../store/settings';
import { useReportAssetUrl } from '../../app/adapters/reportAssetRepository';
import { imageFileToEmbedded } from '../../app/models/documentVisuals';
import {
  defaultReportOptions,
  offeredSections,
  type DocKind,
  type ReportOptions,
  type SectionGroup,
  type SectionId,
} from '../../app/export/documentComposition';

const GROUPS: readonly SectionGroup[] = ['base', 'technical', 'commercial', 'annex'];

/**
 * Composition d'un document, à côté de son aperçu (spec 012, FR-A4).
 *
 * Chaque case cochée se voit aussitôt sur la page : plus de fenêtre qui cache ce qu'on règle. Les
 * visuels viennent des réglages de la société, sauf si ce dossier a les siens (co-marquage,
 * photo du site) ; ceux-là voyagent avec le projet.
 */
export function DocumentPanel({ project, kind, kinds, options, busy, onKind, onOptions, onPrint, onWord }: {
  readonly project: ProjectViewModel;
  readonly kind: DocKind;
  readonly kinds: readonly { readonly key: DocKind; readonly labelKey: string; readonly noteKey: string }[];
  readonly options: ReportOptions;
  readonly busy: boolean;
  readonly onKind: (kind: DocKind) => void;
  readonly onOptions: (options: ReportOptions) => void;
  readonly onPrint: () => void;
  readonly onWord: () => void;
}) {
  const t = useT();
  const offered = offeredSections(kind);
  const chosen = new Set(options.sections);
  const confidential = offered.some((section) => section.confidential && chosen.has(section.id));
  const current = kinds.find((item) => item.key === kind);

  const toggle = (id: SectionId) => {
    const next = new Set(options.sections);
    if (next.has(id)) next.delete(id); else next.add(id);
    onOptions({ ...options, sections: [...next] });
  };

  return (
    <aside className="docs-panel" aria-label={t('generate.title')}>
      <div className="seg docs-kinds" role="tablist" aria-label={t('generate.document')}>
        {kinds.map((item) => (
          <button key={item.key} role="tab" aria-selected={item.key === kind} onClick={() => onKind(item.key)}>{t(item.labelKey)}</button>
        ))}
      </div>
      {current && <p className="label">{t(current.noteKey)}</p>}
      <div className="docs-actions">
        <button className="btn btn-primary" onClick={onPrint}>{t('documents.printPdf')}</button>
        <button className="btn" disabled={busy} onClick={onWord} aria-label={`${t('documents.exportWord')} ${current ? t(current.labelKey) : ''}`}>
          {busy ? t('documents.exporting') : t('documents.word')}
        </button>
      </div>
      {confidential && <p className="generate-warning" role="status">{t('generate.confidentialWarning')}</p>}

      <details className="docs-block" open>
        <summary>{t('generate.sections')}</summary>
        {GROUPS.map((group) => {
          const sections = offered.filter((section) => section.group === group);
          if (sections.length === 0) return null;
          return (
            <fieldset key={group} className="docs-group">
              <legend>{t(`generate.group.${group}`)}</legend>
              {sections.map((section) => (
                <label key={section.id} className={section.confidential ? 'is-confidential' : undefined}>
                  <input type="checkbox" checked={chosen.has(section.id)} disabled={section.required === true} onChange={() => toggle(section.id)} />
                  <span>{t(section.labelKey)}</span>
                </label>
              ))}
            </fieldset>
          );
        })}
        <button className="btn btn-ghost docs-reset" onClick={() => onOptions(defaultReportOptions(kind, options.lang))}>{t('generate.reset')}</button>
      </details>

      <details className="docs-block">
        <summary>{t('generate.options')}</summary>
        <label className="generate-switch">
          <input type="checkbox" checked={options.withPrices} onChange={(event) => onOptions({ ...options, withPrices: event.target.checked })} />
          <span>{t('generate.withPrices')}<small className="label">{t('generate.withPricesHelp')}</small></span>
        </label>
        <label className="docs-field"><span>{t('generate.language')}</span>
          <select value={options.lang} onChange={(event) => onOptions({ ...options, lang: event.target.value as 'fr' | 'en' })}>
            <option value="fr">{t('app.language.fr')}</option>
            <option value="en">{t('app.language.en')}</option>
          </select>
        </label>
        <label className="docs-field"><span>{t('generate.watermark')}</span>
          <input value={options.watermark} placeholder={t('generate.watermarkPlaceholder')} maxLength={24} onChange={(event) => onOptions({ ...options, watermark: event.target.value })} />
        </label>
        <label className="docs-field"><span>{t('generate.fileName')}</span>
          <input value={options.fileName} placeholder={t('generate.fileNameHelp')} onChange={(event) => onOptions({ ...options, fileName: event.target.value })} />
        </label>
      </details>

      <details className="docs-block">
        <summary>{t('generate.visuals')}</summary>
        <VisualChoice project={project} kind="logo" label={t('settings.logoFile')} />
        <VisualChoice project={project} kind="cover" label={t('settings.coverFile')} />
        <p className="label">{t('generate.visualsCompany')} <Link to="/reglages">{t('generate.visualsCompanyLink')}</Link></p>
      </details>
    </aside>
  );
}

/** Un visuel : celui de la société par défaut, ou celui de ce dossier. */
function VisualChoice({ project, kind, label }: { readonly project: ProjectViewModel; readonly kind: 'logo' | 'cover'; readonly label: string }) {
  const t = useT();
  const update = useProjects((session) => session.update);
  const settings = useSettings();
  const companyAsset = useReportAssetUrl(kind === 'logo' ? settings.reports.logoAssetId : settings.reports.coverAssetId);
  const own = kind === 'logo' ? project.details.documentLogo : project.details.projectImage;
  const company = companyAsset ?? (kind === 'logo' ? settings.reports.logoUrl || '/kya-sol-design-logo.png' : null);
  const shown = own || company;
  const [error, setError] = useState<string | null>(null);

  const set = (value: string) => update((draft) => { if (kind === 'logo') draft.details.documentLogo = value; else draft.details.projectImage = value; });
  const replace = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try { set(await imageFileToEmbedded(file, kind)); setError(null); } catch { setError(t('settings.assetError')); }
  };

  return (
    <div className={`visual-choice visual-choice-${kind}`}>
      <span className="visual-choice-head">
        <b>{label}</b>
        <span className={`badge ${own ? 'warn' : ''}`}>{own ? t('generate.visualOwn') : t('generate.visualCompany')}</span>
      </span>
      <span className="visual-slot-frame">{shown ? <img src={shown} alt={label} /> : <span className="label">{t('generate.visualNone')}</span>}</span>
      <span className="visual-slot-actions">
        <label className="btn">{t('generate.visualReplaceHere')}
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" aria-label={`${t('generate.visualReplaceHere')} · ${label}`} hidden onChange={(event) => { void replace(event); }} />
        </label>
        {own && <button type="button" className="btn btn-ghost" onClick={() => set('')}>{t('generate.visualBackToCompany')}</button>}
      </span>
      {error !== null && <small className="error">{error}</small>}
    </div>
  );
}
