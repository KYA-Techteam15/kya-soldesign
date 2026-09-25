import { useMemo } from 'react';
import type { FinanceOutputV1, PresizingOutputV1, SizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { Equipment } from '@ksd/catalog';
import type { ProjectViewModel } from '../../app/models/projectView';

import { useSettings } from '../../store/settings';
import { useUi } from '../../store/ui';
import { translate } from '../../i18n';
import { useReportAssetUrl } from '../../app/adapters/reportAssetRepository';
import { buildProjectDiagram, synopticOptions } from '../../app/diagram/projectDiagram';
import { buildReportDocument, type Block, type DocSection } from '../../app/export/reportModel';
import { defaultReportOptions, type DocKind, type ReportOptions } from '../../app/export/documentComposition';

export type { DocKind };

/**
 * Aperçu avant impression.
 *
 * Il ne décrit plus le document une seconde fois : il rend exactement le modèle
 * de blocs que `docxWriter` transforme en Word. Deux descriptions parallèles du
 * même rapport avaient fini par diverger — l'écran annonçait des puissances que
 * le moteur n'avait jamais calculées.
 */
export function ReportA4({ project, kind, sizing, finance, solar, presizing, catalog, options, version = null, visuals }: {
  project: ProjectViewModel;
  /** Visuels effectifs (dossier ou société), résolus par l'appelant ; à défaut, ceux des réglages. */
  visuals?: { readonly logoUrl: string; readonly coverUrl: string | null };
  version?: { readonly number: number; readonly issuedAtIso: string } | null;
  kind: DocKind;
  sizing: SizingOutputV1 | null;
  finance: FinanceOutputV1 | null;
  solar: SolarResourceAnalysisOutputV1 | null;
  presizing?: PresizingOutputV1 | null;
  catalog: readonly Equipment[];
  options?: ReportOptions;
}) {
  const settings = useSettings();
  const uiLang = useUi((state) => state.lang);
  const logoUrl = useReportAssetUrl(settings.reports.logoAssetId);
  const coverUrl = useReportAssetUrl(settings.reports.coverAssetId);
  const signatureUrl = useReportAssetUrl(settings.reports.signatureAssetId);
  const resolved = options ?? defaultReportOptions(kind, uiLang);
  const t = useMemo(() => (key: string) => translate(key, resolved.lang), [resolved.lang]);

  /**
   * Visuel de marque effectif.
   *
   * Sans fichier importé, l'aperçu retombait sur le logo livré avec
   * l'application tandis que le Word, lui, ne recevait rien : le même dossier
   * sortait signé à l'écran et anonyme dans le document.
   */
  const effectiveLogoUrl = visuals?.logoUrl ?? (project.details.documentLogo || logoUrl || settings.reports.logoUrl || '/kya-sol-design-logo.png');
  const effectiveCoverUrl = visuals ? visuals.coverUrl : (project.details.projectImage || coverUrl);

  // Toutes les pièces reçoivent la planche complète : le synoptique condensé
  // tenait dans une colonne, mais n'y était plus lisible.
  const diagram = useMemo(() => {
    if (!sizing) return null;
    // Rapport, offre, proforma : le synoptique, conçu pour une page A4 ; le dossier d'exécution : la planche complète.
    const built = buildProjectDiagram({ project, sizing, catalog, settings, lang: resolved.lang, ...(kind === 'dossier_exec' ? {} : { options: synopticOptions }) });
    return { svg: built.svg, width: built.plan.width, height: built.plan.height, bom: built.plan.bom };
  }, [project, sizing, catalog, settings, resolved.lang, kind]);

  const document = useMemo(() => buildReportDocument({
    project, kind, sizing, finance, solar, presizing, catalog, settings, t, diagram,
    assets: { logoUrl: effectiveLogoUrl, coverUrl: effectiveCoverUrl, signatureUrl },
    options: resolved,
    version,
  }), [project, kind, sizing, finance, solar, presizing, catalog, settings, t, diagram, effectiveLogoUrl, effectiveCoverUrl, signatureUrl, resolved, version]);

  const brandContact = [settings.company.address, settings.company.phone, settings.company.email].filter(Boolean).join(' · ');

  return <div className="a4-stack">
    {document.sections.map((section, index) => <Page
      key={index}
      section={section}
      documentFooter={document.footer}
      companyName={settings.company.name}
      contact={brandContact}
      editedOn={document.issuedOn}
      logo={effectiveLogoUrl}
      watermark={document.watermark}
      page={index + 1}
      total={document.sections.length}
      pageLabel={t('report.page')}
    />)}
  </div>;
}

interface PageProps {
  readonly section: DocSection;
  readonly documentFooter: string;
  readonly companyName: string;
  readonly contact: string;
  readonly editedOn: string;
  readonly logo: string;
  readonly watermark: string;
  readonly page: number;
  readonly total: number;
  readonly pageLabel: string;
}

function Page({ section, documentFooter, companyName, contact, editedOn, logo, watermark, page, total, pageLabel }: PageProps) {
  const isCover = section.blocks[0]?.kind === 'cover';
  const className = ['a4', section.orientation === 'landscape' ? 'a4-landscape' : '', isCover ? 'a4-cover' : ''].filter(Boolean).join(' ');
  return <article className={className}>
    {watermark.length > 0 && <div className="a4-watermark" aria-hidden="true">{watermark.toUpperCase()}</div>}
    {!isCover && <>
      <div className="a4-brand">
        <img className="a4-logo-image" src={logo} alt={companyName || 'KYA-SolDesign'} />
        <div className="a4-who"><b>{companyName}</b><br />{contact || '—'}<br />{editedOn}</div>
      </div>
      <div className="a4-rule" />
    </>}
    {section.blocks.map((block, index) => <BlockView key={index} block={block} companyName={companyName} contact={contact} />)}
    <div className="a4-spacer" />
    <div className="a4-foot"><span>{documentFooter}</span><span>{pageLabel} {page} / {total}</span></div>
  </article>;
}

function BlockView({ block, companyName, contact }: { block: Block; companyName: string; contact: string }) {
  switch (block.kind) {
    // Page de garde : l'œil descend du logo au titre, du titre à l'image, et
    // ne rencontre les mentions administratives qu'ensuite. Tout est centré —
    // une couverture n'est pas une page de texte.
    case 'cover':
      return <>
        <div className="cover-mark">
          <img src={block.logoUrl || '/kya-sol-design-logo.png'} alt={companyName || 'KYA-SolDesign'} />
        </div>
        <div className="cover-rule"><i /><i /></div>
        <div className="cover-kind">{block.docKind}</div>
        <h1 className="cover-title">{block.project}</h1>
        <div className="cover-sub">{block.subtitle}</div>
        {block.coverUrl && <figure className="cover-figure"><img src={block.coverUrl} alt="" /></figure>}
        <div className="a4-spacer" />
        <div className="cover-band">
          <div><span className="cover-lbl">{block.systemLabel}</span><b>{block.system}</b></div>
          <div className="cover-seal"><b>{block.sri}</b><span className="cover-lbl">SRI</span></div>
        </div>
        <dl className="cover-grid">{block.cells.map((cell) => <div key={cell.label}><dt>{cell.label}</dt><dd>{cell.value}</dd></div>)}</dl>
        <div className="cover-foot"><span>{block.ownership}</span><span>{contact}</span></div>
      </>;

    case 'title':
      return <><h1 className="a4-title">{block.text}</h1><div className="a4-sub">{block.subtitle}</div></>;

    case 'heading':
      return <h3 className="a4-sec">{block.text}</h3>;

    case 'meta':
      return <dl className="a4-meta">{block.items.map((entry) => <div key={entry.label}>
        <dt>{entry.label}</dt><dd>{entry.value}{entry.note && <small>{entry.note}</small>}</dd>
      </div>)}</dl>;

    case 'headline':
      return <div className="a4-headline">
        <div><h2>{block.label}</h2><p>{block.text}</p></div>
        <div className="a4-seal"><b>{block.sealValue}</b><span>{block.sealLabel}</span></div>
      </div>;

    case 'table':
      return <table className="a4-tbl">
        <thead><tr>{block.head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead>
        <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex} className={rowClass(block.emphasis, rowIndex, block.rows.length)}>
          {row.map((cell, cellIndex) => <td key={cellIndex} className={block.numeric.includes(cellIndex) ? 'num' : ''}>{cell}</td>)}
        </tr>)}</tbody>
      </table>;

    case 'kpis':
      return <dl className="a4-kpis">{block.items.map((entry) => <div key={entry.label}>
        <dt>{entry.label}</dt>
        <dd className={entry.unit === '' && !/^[\d\s.,+-]*$/u.test(entry.value) ? 'a4-kpi-text' : ''}>
          {entry.value}{entry.unit && <span className="u">{entry.unit}</span>}
        </dd>
      </div>)}</dl>;

    case 'paragraph':
      return block.label.trim().length > 0
        ? <div className="a4-cond"><p><b>{block.label}</b> {block.text}</p></div>
        : <p className="a4-note">{block.text}</p>;

    case 'checklist':
      return <ul className="a4-checklist">{block.items.map((label) => <li key={label}>{label}</li>)}</ul>;

    case 'image':
      return <div className="a4-diagram" dangerouslySetInnerHTML={{ __html: block.svg }} />;

    case 'signature':
      return <div className="a4-sign">
        <div>{block.imageUrl && <img className="a4-sign-mark" src={block.imageUrl} alt="" />}{block.left}</div>
        <div>{block.right}</div>
      </div>;
  }
}

/**
 * Les lignes de total se lisent d'un coup d'œil. `emphasis` porte l'index de
 * la première ligne accentuée ; ce qui suit est un sous-total, et la dernière
 * ligne d'une table qui en a plusieurs porte le montant final.
 */
function rowClass(emphasis: readonly number[], index: number, count: number): string {
  if (!emphasis.includes(index) && index < Math.min(...emphasis, count)) return '';
  if (emphasis.includes(index)) return 'total';
  if (index === count - 1 && emphasis.length > 0) return 'grand';
  return index > Math.min(...emphasis, count) ? 'sub' : '';
}
