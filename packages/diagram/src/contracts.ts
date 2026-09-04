/**
 * Contrats du schéma unifilaire.
 *
 * Trois représentations successives, volontairement disjointes :
 *
 *   1. `SingleLineTopology` — le domaine électrique. Aucune coordonnée.
 *   2. `DiagramPlan` — la planche : symboles placés, conducteurs routés.
 *   3. le SVG — une chaîne, produite par `render.ts`.
 *
 * Chaque couche porte exactement un point de souplesse : le type de système
 * pour la topologie, le gabarit pour le placement, le registre pour les
 * symboles, le dictionnaire d'étiquettes pour le rendu.
 */

/** Nature du conducteur, qui détermine la couleur et le style du trait. */
export type ConductorKind =
  | 'dc-positive'
  | 'dc-negative'
  | 'ac'
  | 'earth'
  | 'signal';

/** Symboles du vocabulaire graphique, d'après la CEI 60617. */
export type SymbolKind =
  | 'pv-module'
  | 'series-break'
  | 'parallel-break'
  | 'dc-fuse'
  | 'combiner'
  | 'dc-spd'
  | 'dc-switch'
  | 'charge-controller'
  | 'inverter'
  | 'battery'
  | 'dc-breaker'
  | 'ac-breaker'
  | 'ac-spd'
  | 'rcd'
  | 'busbar'
  | 'load'
  | 'meter'
  | 'transfer-switch'
  | 'generator'
  | 'grid'
  | 'pump'
  | 'street-light'
  | 'earth-bar'
  | 'earth-link'
  | 'earth-electrode';

/** Gabarit de sortie. Contraint la largeur disponible, donc le niveau de détail. */
export type SheetFormat = 'a4-landscape' | 'a4-portrait';

/**
 * Niveau de détail du champ photovoltaïque.
 * `full` dessine une colonne par chaîne ; `synoptic` condense le champ en une
 * colonne unique légendée de son total, seule façon de tenir en A4 portrait.
 */
export type DetailLevel = 'full' | 'synoptic';

/* -------------------------------------------------------------------------- */
/* 1. Topologie — le domaine                                                   */
/* -------------------------------------------------------------------------- */

/** Une chaîne de modules en série sur une entrée MPPT. */
export interface PvStringSpec {
  readonly reference: string;
  readonly modules: number;
  readonly vocColdV: number | null;
  readonly iscA: number | null;
}

/** Une entrée MPPT d'onduleur, et les chaînes qui s'y raccordent. */
export interface MpptInputSpec {
  readonly reference: string;
  readonly strings: readonly PvStringSpec[];
}

/** Un appareil de protection tel que retenu à l'étape « Protections ». */
export interface ProtectionSpec {
  readonly reference: string;
  readonly kind: string;
  /** Calibre retenu en ampères. `null` tant que l'utilisateur n'a pas choisi. */
  readonly ratingA: number | null;
  readonly voltageV: number | null;
  readonly quantity: number;
}

/** Une liaison câblée dimensionnée. */
export interface CableSpec {
  /** Nombre de conducteurs actifs, pour la notation « n × section ». */
  readonly conductors: number;
  readonly sectionMm2: number | null;
  readonly currentA: number | null;
  readonly lengthM: number | null;
}

/** Un onduleur et tout ce qui pend à ses bornes côté continu. */
export interface InverterUnitSpec {
  readonly id: string;
  readonly reference: string;
  readonly powerKw: number | null;
  /** Référence commerciale, si l'équipement est choisi au catalogue. */
  readonly product: string | null;
  readonly inputs: readonly MpptInputSpec[];
  /** Régulateur de charge séparé, sur les topologies qui en comportent un. */
  readonly chargeController: ProtectionSpec | null;
  readonly stringFuse: ProtectionSpec | null;
  readonly combiner: boolean;
  readonly dcSpd: ProtectionSpec | null;
  readonly dcSwitch: ProtectionSpec | null;
  readonly dcCable: CableSpec | null;
}

/** Le parc de stockage, décrit par sa matrice série × parallèle. */
export interface BatteryBankSpec {
  readonly unitsInSeries: number;
  readonly stringsInParallel: number;
  readonly totalUnits: number;
  readonly unitVoltageV: number | null;
  readonly unitCapacityAh: number | null;
  readonly bankVoltageV: number | null;
  readonly usefulEnergyKwh: number | null;
  readonly product: string | null;
  readonly breaker: ProtectionSpec | null;
  readonly cable: CableSpec | null;
}

/** La distribution alternative, de la sortie onduleur aux circuits terminaux. */
export interface AcLineSpec {
  readonly breaker: ProtectionSpec | null;
  readonly spd: ProtectionSpec | null;
  readonly rcd: ProtectionSpec | null;
  readonly voltageV: number | null;
  readonly cable: CableSpec | null;
  /** Comptage d'énergie, présent dès qu'il y a échange avec un réseau. */
  readonly meter: boolean;
  /** Inverseur de source, sur les topologies à secours. */
  readonly transferSwitch: ProtectionSpec | null;
  /** Raccordement au réseau de distribution. */
  readonly grid: { readonly label: string; readonly voltageV: number | null } | null;
  /** Groupe électrogène de secours. */
  readonly generator: { readonly label: string; readonly powerKw: number | null } | null;
  /** Nature de la charge terminale, qui décide du symbole. */
  readonly loadKind: 'building' | 'pump' | 'street-light';
  readonly loadLabel: string;
}

/** Le réseau de terre : collecteur, barrette de coupure, prise de terre. */
export interface EarthNetworkSpec {
  readonly enabled: boolean;
  /** Section du conducteur principal de protection, en mm². */
  readonly mainSectionMm2: number | null;
  /** Section de la liaison à la prise de terre, en mm². */
  readonly electrodeSectionMm2: number | null;
  /** Barrette de coupure, exigée pour la mesure de la résistance de terre. */
  readonly cutoffLink: boolean;
}

/** Le cartouche du plan. */
export interface TitleBlock {
  readonly company: string;
  readonly project: string;
  readonly client: string;
  readonly reference: string;
  readonly location: string;
  readonly date: string;
  readonly author: string;
  readonly sheet: string;
}

/** Écart relevé pendant la construction de la topologie ou de la planche. */
export interface TopologyIssue {
  readonly level: 'error' | 'warning' | 'info';
  readonly message: string;
}

/** Réglages de représentation, indépendants du dimensionnement. */
export interface DiagramOptions {
  readonly format: SheetFormat;
  readonly detail: DetailLevel;
  /**
   * Continu représenté par une paire de conducteurs colorés (+ rouge / − bleu),
   * ou par un trait unique annoté du nombre de conducteurs.
   */
  readonly dcRepresentation: 'pair' | 'single';
  readonly maxDrawnModules: number;
  readonly maxDrawnStrings: number;
  readonly maxDrawnBatteries: number;
  readonly showLegend: boolean;
  readonly showTitleBlock: boolean;
  /** Cadre de repérage alphanumérique en marge de planche. */
  readonly showGridFrame: boolean;
}

/** Le champ photovoltaïque, résumé pour la légende du cadre. */
export interface PvFieldSummary {
  readonly totalModules: number;
  readonly modulePowerW: number | null;
  readonly powerKwc: number | null;
  readonly product: string | null;
}

/** L'architecture complète de l'installation, sans géométrie. */
export interface SingleLineTopology {
  readonly title: TitleBlock;
  readonly field: PvFieldSummary;
  readonly inverters: readonly InverterUnitSpec[];
  readonly battery: BatteryBankSpec | null;
  readonly ac: AcLineSpec;
  readonly earth: EarthNetworkSpec;
  readonly options: DiagramOptions;
  readonly issues: readonly TopologyIssue[];
}

/* -------------------------------------------------------------------------- */
/* 2. Plan — la géométrie                                                      */
/* -------------------------------------------------------------------------- */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Un symbole posé sur la planche, boîte englobante en coordonnées planche. */
export interface PlacedSymbol {
  readonly id: string;
  readonly kind: SymbolKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Repère d'appareil (`S1`, `Q2`, `O1`…), partagé avec la nomenclature. */
  readonly reference: string | null;
  readonly caption: string | null;
  readonly data: Readonly<Record<string, string | number | boolean>>;
}

/** Un conducteur tracé, en polyligne orthogonale. */
export interface Wire {
  readonly id: string;
  readonly conductor: ConductorKind;
  readonly points: readonly Point[];
  /** Trait discontinu : liaison condensée par le dessin, non réelle. */
  readonly dashed: boolean;
  readonly annotation: string | null;
}

/** Un cadre en trait mixte regroupant des symboles. */
export interface Frame {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Un texte libre posé sur la planche. */
export interface Caption {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly size: number;
  readonly weight: 400 | 600 | 700;
  readonly tone: 'ink' | 'muted' | 'accent';
}

/** Une entrée de la légende. */
export interface LegendRow {
  readonly kind: SymbolKind | ConductorKind;
  readonly label: string;
}

/** Une ligne de nomenclature, dérivée de la topologie. */
export interface BillOfMaterialRow {
  readonly reference: string;
  readonly designation: string;
  readonly characteristic: string;
  readonly quantity: number;
  /** Case du cadre de repérage où trouver l'appareil, ex. « H8 ». */
  readonly gridRef: string;
}

/** Le cadre de repérage : colonnes en lettres, rangées en chiffres. */
export interface GridFrame {
  readonly columns: readonly string[];
  readonly rows: readonly string[];
  readonly cell: number;
  readonly margin: number;
}

/** La planche complète, prête à être rendue. */
export interface DiagramPlan {
  readonly width: number;
  readonly height: number;
  readonly format: SheetFormat;
  readonly symbols: readonly PlacedSymbol[];
  readonly wires: readonly Wire[];
  readonly frames: readonly Frame[];
  readonly captions: readonly Caption[];
  readonly legend: readonly LegendRow[];
  readonly bom: readonly BillOfMaterialRow[];
  readonly grid: GridFrame | null;
  readonly title: TitleBlock;
  readonly showTitleBlock: boolean;
  readonly issues: readonly TopologyIssue[];
  /**
   * Taille du plus petit texte une fois la planche réduite au format visé,
   * en points typographiques. En dessous de 6 pt, la planche est illisible
   * à l'impression : c'est un défaut de conception, pas un réglage.
   */
  readonly smallestTextPt: number;
}
