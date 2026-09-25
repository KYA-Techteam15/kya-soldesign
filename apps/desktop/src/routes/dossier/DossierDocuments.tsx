import { useEffect, useMemo, useRef, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { FinanceOutputV1, PresizingOutputV1, SizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../../app/models/projectView';
import { ReportA4 } from './ReportA4';
import { DocumentPanel } from './DocumentPanel';
import { assessDocumentReadiness, type DocumentReadiness } from '../../app/models/documentReadiness';
import type { CalculationFacts } from '../../domain/completion';
import { useUi } from '../../store/ui';
import { useSettings } from '../../store/settings';
import { translate, useT } from '../../i18n';
import { useReportAssetUrl } from '../../app/adapters/reportAssetRepository';
import { buildReportDocument } from '../../app/export/reportModel';
import { downloadDocx } from '../../app/export/docxWriter';
import { buildProjectDiagram, synopticOptions } from '../../app/diagram/projectDiagram';
import { defaultReportOptions, type DocKind, type ReportOptions } from '../../app/export/documentComposition';
import { useEntitlement, useLicense } from '../../app/licensing/licenseStore';

const DOCS: { key: DocKind; labelKey: string; noteKey: string }[] = [
  { key: 'rapport', labelKey: 'documents.report', noteKey: 'documents.reportNote' },
  { key: 'offre', labelKey: 'documents.offer', noteKey: 'documents.offerNote' },
  { key: 'proforma', labelKey: 'documents.proforma', noteKey: 'documents.proformaNote' },
  { key: 'dossier_exec', labelKey: 'documents.execution', noteKey: 'documents.executionNote' },
];

/**
 * Pièces proposées à l'écran.
 *
 * L'offre interne et le dossier d'exécution restent construits et testés, mais ne sont pas encore
 * présentables : remettre leur clé dans cette liste suffira à les rouvrir.
 */
const PUBLISHED: readonly DocKind[] = ['rapport', 'proforma'];
/** Pièces qui n'ont pas de sens sans les prix : fermées aux éditions sans `documents.pricing`. */
const PRICED: readonly DocKind[] = ['proforma', 'offre'];
/** Largeur de la page A4 à l'écran, en pixels CSS : la référence de la réduction d'aperçu. */
const PAGE_WIDTH_PX = 820;

export function DossierDocuments({ project, sizing, finance, solar, presizing, catalog, facts, version = null }: {
  project: ProjectViewModel;
  facts: CalculationFacts;
  sizing: SizingOutputV1 | null;
  finance: FinanceOutputV1 | null;
  solar: SolarResourceAnalysisOutputV1 | null;
  presizing: PresizingOutputV1 | null;
  catalog: readonly Equipment[];
  /** Version émise affichée : numéro et date portés par les documents. */
  version?: { readonly number: number; readonly issuedAtIso: string } | null;
}) {
  const t = useT();
  const { ask, notify } = useUi();
  const settings = useSettings();
  const lang = useUi((state) => state.lang);
  const [requestedKind, setKind] = useState<DocKind>('rapport');
  const pricing = useEntitlement('documents.pricing');
  const wordAllowed = useEntitlement('documents.word');
  const forcedWatermark = useLicense((state) => state.view?.payload?.watermark ?? null);
  const shown = DOCS.filter((doc) => PUBLISHED.includes(doc.key) && (pricing || !PRICED.includes(doc.key)));
  const kind: DocKind = shown.some((doc) => doc.key === requestedKind) ? requestedKind : 'rapport';
  const logoUrl = useReportAssetUrl(settings.reports.logoAssetId);
  const coverUrl = useReportAssetUrl(settings.reports.coverAssetId);
  const signatureUrl = useReportAssetUrl(settings.reports.signatureAssetId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  /* Visuels effectifs : ceux du dossier s'il en a, sinon ceux de la société ; le Word reçoit les mêmes que l'aperçu. */
  const effectiveLogoUrl = project.details.documentLogo || logoUrl || settings.reports.logoUrl || '/kya-sol-design-logo.png';
  const effectiveCoverUrl = project.details.projectImage || coverUrl;

  /**
   * Composition retenue par pièce, pour la durée de la séance : réglée puis perdue au changement
   * de pièce, elle serait à refaire à chaque tirage.
   */
  const [composition, setComposition] = useState<Partial<Record<DocKind, ReportOptions>>>({});
  /* Ce que la licence impose l'emporte sur la composition : prix retirés sans `documents.pricing`,
     filigrane de l'édition (académique, étudiant) dans la langue du document. L'objet reste le même
     d'un rendu à l'autre : l'aperçu ne se remet en page que si la composition change vraiment. */
  const chosenForKind = composition[kind];
  const options = useMemo<ReportOptions>(() => {
    const chosen = chosenForKind ?? defaultReportOptions(kind, lang);
    return {
      ...chosen,
      withPrices: pricing && chosen.withPrices,
      watermark: forcedWatermark === null ? chosen.watermark : translate(`license.watermark.${forcedWatermark}`, chosen.lang),
    };
  }, [chosenForKind, kind, lang, pricing, forcedWatermark]);
  const readinessFor = (target: DocKind, chosen: ReportOptions): DocumentReadiness =>
    assessDocumentReadiness({ project, kind: target, facts, withPrices: chosen.withPrices, companyName: settings.company.name });
  const readiness = readinessFor(kind, options);

  // L'aperçu se réduit à la largeur de sa colonne ; l'impression, elle, reste à 100 %.
  useEffect(() => {
    const node = previewRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setZoom(Math.min(1, Math.max(0.45, (entry?.contentRect.width ?? PAGE_WIDTH_PX) / PAGE_WIDTH_PX))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /** Garde commune au Word et à l'impression : un bloquant arrête l'action, un avertissement demande confirmation. */
  const guarded = (run: () => void) => {
    if (readiness.blockers.length > 0) {
      notify({ kind: 'error', title: t('documents.readiness.blocked'), detail: readiness.blockers.map((item) => t(item.messageKey)).join(' · ') });
      return;
    }
    if (readiness.warnings.length > 0) {
      ask({ title: t('documents.readiness.warningTitle'), message: readiness.warnings.map((warning) => t(warning.messageKey)).join(' · '), confirmLabel: t('documents.readiness.continue'), onConfirm: run });
      return;
    }
    run();
  };

  /** Export Word : il reprend l'aperçu section pour section ; seule la planche change de nature. */
  const word = async () => {
    setBusy(true);
    setError(null);
    try {
      const generated = sizing ? buildProjectDiagram({ project, sizing, catalog, settings, lang: options.lang, ...(kind === 'dossier_exec' ? {} : { options: synopticOptions }) }) : null;
      await downloadDocx(buildReportDocument({
        project, kind, sizing, finance, solar, presizing, catalog, settings,
        t: (key: string) => translate(key, options.lang),
        assets: { logoUrl: effectiveLogoUrl, coverUrl: effectiveCoverUrl, signatureUrl },
        options,
        version,
        diagram: generated ? { svg: generated.svg, width: generated.plan.width, height: generated.plan.height, bom: generated.plan.bom } : null,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('documents.exportFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="docs-layout">
      <div className="docs-preview" ref={previewRef}>
        {error !== null && <div className="document-readiness is-blocked" role="status"><b>{t('documents.exportFailed')}</b><span>{error}</span></div>}
        {(readiness.blockers.length > 0 || readiness.warnings.length > 0) && <div className={`document-readiness no-print ${readiness.blockers.length > 0 ? 'is-blocked' : ''}`} role="status">
          <b>{readiness.blockers.length > 0 ? t('documents.readiness.blocked') : t('documents.readiness.warnings')}</b>
          {readiness.blockers.concat(readiness.warnings).map((issue) => <span key={issue.code}>{t(issue.messageKey)}</span>)}
        </div>}
        <div className="paper-wrap docs-zoom" style={{ zoom, width: PAGE_WIDTH_PX }}>
          <ReportA4
            project={project}
            kind={kind}
            sizing={sizing}
            finance={finance}
            solar={solar}
            presizing={presizing}
            catalog={catalog}
            options={options}
            version={version}
            visuals={{ logoUrl: effectiveLogoUrl, coverUrl: effectiveCoverUrl }}
          />
        </div>
      </div>
      <DocumentPanel
        project={project}
        kind={kind}
        kinds={shown}
        options={options}
        busy={busy}
        locks={{ word: !wordAllowed, pricing: !pricing, watermark: forcedWatermark !== null }}
        onKind={setKind}
        onOptions={(next) => setComposition((current) => ({ ...current, [kind]: next }))}
        onPrint={() => guarded(() => window.setTimeout(() => window.print(), 120))}
        onWord={() => { if (wordAllowed) guarded(() => { void word(); }); }}
      />
    </div>
  );
}
