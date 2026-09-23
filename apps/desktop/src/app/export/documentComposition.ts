/**
 * Composition des documents.
 *
 * Les quatre pièces ont longtemps partagé le même contenu : seul le titre de
 * couverture changeait. Une proforma portait donc les sections de câbles et le
 * CO₂ évité, et l'« offre interne » montrait au vendeur exactement ce que
 * voyait le client. Cette carte dit, pour chaque pièce, quelles sections elle
 * porte — et l'utilisateur peut en retirer au moment de la générer.
 */

export type DocKind = 'rapport' | 'offre' | 'proforma' | 'dossier_exec';

export type SectionId =
  | 'cover'
  | 'identity'
  | 'headline'
  | 'siteResource'
  | 'loadNeeds'
  | 'methodology'
  | 'presizing'
  | 'system'
  | 'performance'
  | 'protections'
  | 'pricing'
  | 'internalCosts'
  | 'economics'
  | 'conditions'
  | 'payment'
  | 'signature'
  | 'diagram'
  | 'billOfMaterial'
  | 'commissioning';

export interface SectionDescriptor {
  readonly id: SectionId;
  /** Clé de libellé, affichée dans le dialogue de génération. */
  readonly labelKey: string;
  /** Une section obligatoire ne peut pas être décochée. */
  readonly required?: boolean;
  /** La section porte des montants : elle disparaît en mode « sans prix ». */
  readonly monetary?: boolean;
  /** La section porte des coûts d'achat et des marges : jamais chez le client. */
  readonly confidential?: boolean;
}

export const SECTIONS: readonly SectionDescriptor[] = [
  { id: 'cover', labelKey: 'compose.cover', required: true },
  { id: 'identity', labelKey: 'compose.identity', required: true },
  { id: 'headline', labelKey: 'compose.headline' },
  { id: 'siteResource', labelKey: 'compose.siteResource' },
  { id: 'loadNeeds', labelKey: 'compose.loadNeeds' },
  { id: 'methodology', labelKey: 'compose.methodology' },
  { id: 'presizing', labelKey: 'compose.presizing' },
  { id: 'system', labelKey: 'compose.system' },
  { id: 'performance', labelKey: 'compose.performance' },
  { id: 'protections', labelKey: 'compose.protections' },
  { id: 'pricing', labelKey: 'compose.pricing', monetary: true },
  { id: 'internalCosts', labelKey: 'compose.internalCosts', monetary: true, confidential: true },
  { id: 'economics', labelKey: 'compose.economics', monetary: true },
  { id: 'conditions', labelKey: 'compose.conditions' },
  { id: 'payment', labelKey: 'compose.payment', monetary: true },
  { id: 'signature', labelKey: 'compose.signature' },
  { id: 'diagram', labelKey: 'compose.diagram' },
  { id: 'billOfMaterial', labelKey: 'compose.billOfMaterial' },
  { id: 'commissioning', labelKey: 'compose.commissioning' },
];

const DESCRIPTORS = new Map(SECTIONS.map((section) => [section.id, section]));

export function sectionDescriptor(id: SectionId): SectionDescriptor {
  const found = DESCRIPTORS.get(id);
  if (found === undefined) throw new Error(`UNKNOWN_REPORT_SECTION:${id}`);
  return found;
}

/**
 * Composition par défaut de chaque pièce.
 *
 * L'ordre est celui de lecture : on remet un document, pas une base de
 * données. Le rapport raconte le projet ; l'offre interne raconte la marge ;
 * la proforma ne parle que d'argent ; le dossier d'exécution ne parle que du
 * chantier.
 */
export const DEFAULT_COMPOSITION: Readonly<Record<DocKind, readonly SectionId[]>> = {
  // Le bandeau « Système retenu » répétait mot pour mot la couverture, deux
  // pages plus loin. Il est retiré : la couverture l'annonce, le tableau du
  // système le détaille, rien ne justifiait un troisième passage.
  rapport: [
    'cover', 'identity',
    'siteResource', 'loadNeeds', 'methodology', 'presizing',
    'system', 'performance',
    'pricing', 'economics', 'conditions', 'signature',
    'diagram', 'protections',
  ],
  offre: [
    'cover', 'identity',
    'loadNeeds', 'methodology', 'presizing',
    'system', 'performance',
    'internalCosts', 'pricing', 'economics',
    'diagram',
  ],
  proforma: [
    'cover', 'identity',
    'pricing', 'payment', 'conditions', 'signature',
  ],
  dossier_exec: [
    'cover', 'identity',
    'system', 'protections',
    'diagram', 'billOfMaterial', 'commissioning',
    'signature',
  ],
};

export interface ReportOptions {
  /** Sections retenues, dans l'ordre de la composition par défaut. */
  readonly sections: readonly SectionId[];
  /** Masque tout montant — la variante « technique seule » d'une pièce. */
  readonly withPrices: boolean;
  /** Filigrane imprimé en travers de chaque page, vide pour aucun. */
  readonly watermark: string;
  /** Langue du document, indépendante de celle de l'interface. */
  readonly lang: 'fr' | 'en';
  /** Nom de fichier sans extension, vide pour celui déduit du projet. */
  readonly fileName: string;
}

export function defaultReportOptions(kind: DocKind, lang: 'fr' | 'en'): ReportOptions {
  return {
    sections: DEFAULT_COMPOSITION[kind],
    // Une pièce d'exécution part au chantier : les montants n'y ont rien à
    // faire tant que personne ne les a explicitement demandés.
    withPrices: kind !== 'dossier_exec',
    watermark: '',
    lang,
    fileName: '',
  };
}

/**
 * Sections effectivement rendues.
 *
 * Le filtre monétaire s'applique après le choix de l'utilisateur : décocher
 * « avec les prix » ne doit pas lui faire perdre les cases qu'il avait cochées
 * s'il change d'avis.
 */
export function resolveSections(kind: DocKind, options: ReportOptions): readonly SectionId[] {
  const chosen = new Set(options.sections);
  return DEFAULT_COMPOSITION[kind]
    .filter((id) => chosen.has(id))
    .filter((id) => options.withPrices || !sectionDescriptor(id).monetary);
}

/** Sections proposées dans le dialogue, dans l'ordre du document. */
export function offeredSections(kind: DocKind): readonly SectionDescriptor[] {
  return DEFAULT_COMPOSITION[kind].map(sectionDescriptor);
}
