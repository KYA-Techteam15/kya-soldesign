/**
 * Étiquettes du schéma.
 *
 * Le générateur n'écrit jamais de littéral : l'application lui passe ce
 * dictionnaire depuis `useT()`, ce qui garde le dessin traduisible et le
 * contrôle `check-i18n` satisfait. Les valeurs par défaut servent aux tests
 * et aux appels hors interface.
 */
export interface DiagramLabels {
  /** Séparateur décimal. La virgule est une décision de produit, pas de vue. */
  readonly decimal: string;
  readonly pvField: string;
  readonly pvFieldOf: string;
  readonly modulesOf: string;
  readonly stringFuse: string;
  readonly combiner: string;
  readonly spdType2: string;
  readonly dcSwitch: string;
  readonly chargeController: string;
  readonly inverter: string;
  readonly batteryBank: string;
  readonly batteryBreaker: string;
  readonly usefulEnergy: string;
  readonly units: string;
  readonly acBreaker: string;
  readonly acSpd: string;
  readonly rcd: string;
  readonly busbar: string;
  readonly meter: string;
  readonly transferSwitch: string;
  readonly generator: string;
  readonly grid: string;
  readonly loadBuilding: string;
  readonly loadPump: string;
  readonly loadStreetLight: string;
  readonly earthBar: string;
  readonly earthCutoff: string;
  readonly earthElectrode: string;
  readonly toBeDefined: string;
  readonly legend: string;
  readonly conductorPlus: string;
  readonly conductorMinus: string;
  readonly conductorAc: string;
  readonly conductorEarth: string;
  readonly titleSheet: string;
  readonly titleCompany: string;
  readonly titleProject: string;
  readonly titleClient: string;
  readonly titleReference: string;
  readonly titleLocation: string;
  readonly titleDate: string;
  readonly titleAuthor: string;
  readonly titlePlate: string;
  readonly bomReference: string;
  readonly bomDesignation: string;
  readonly bomCharacteristic: string;
  readonly bomQuantity: string;
  readonly bomLocation: string;
  readonly fuseSwitch: string;
  readonly dcBreaker: string;
  readonly unit: string;
  readonly inSeries: string;
  readonly inParallel: string;
  readonly strings: string;
  readonly stringOf: string;
  readonly stringsOf: string;
  readonly modules: string;
  readonly inParallelUnits: string;
  readonly acBoard: string;
  readonly mainEarthTerminal: string;
  readonly conductorDc: string;
  readonly titleRevision: string;
  readonly moreStrings: string;
}

export const FR_LABELS: DiagramLabels = {
  decimal: ',',
  pvField: 'Champ PV',
  pvFieldOf: 'Champ de',
  modulesOf: 'modules de',
  stringFuse: 'Fusible gPV',
  combiner: 'Boîte de jonction',
  spdType2: 'Parafoudre type 2',
  dcSwitch: 'Sectionneur DC',
  chargeController: 'Régulateur de charge',
  inverter: 'Onduleur',
  batteryBank: 'Parc batteries',
  batteryBreaker: 'Disjoncteur DC',
  usefulEnergy: 'kWh utiles',
  units: 'unités',
  acBreaker: 'Disjoncteur AC',
  acSpd: 'Parafoudre AC',
  rcd: 'Différentiel 30 mA',
  busbar: 'Jeu de barres',
  meter: 'Compteur d’énergie',
  transferSwitch: 'Inverseur de source',
  generator: 'Groupe électrogène',
  grid: 'Réseau de distribution',
  loadBuilding: 'Charges du site',
  loadPump: 'Pompe',
  loadStreetLight: 'Luminaire',
  earthBar: 'Bornier de terre',
  earthCutoff: 'Barrette de mesure',
  earthElectrode: 'Prise de terre',
  toBeDefined: 'à définir',
  legend: 'Légende',
  conductorPlus: 'Conducteur continu +',
  conductorMinus: 'Conducteur continu −',
  conductorAc: 'Liaison alternative',
  conductorEarth: 'Conducteur de protection (PE)',
  titleSheet: 'SCHÉMA UNIFILAIRE',
  titleCompany: 'Société',
  titleProject: 'Projet',
  titleClient: 'Client',
  titleReference: 'Référence',
  titleLocation: 'Localisation',
  titleDate: 'Date',
  titleAuthor: 'Auteur',
  titlePlate: 'Planche',
  bomReference: 'Repère',
  bomDesignation: 'Désignation',
  bomCharacteristic: 'Caractéristique',
  bomQuantity: 'Qté',
  bomLocation: 'Repérage',
  fuseSwitch: 'Sectionneur-fusible',
  dcBreaker: 'Disjoncteur DC',
  unit: 'unité',
  inSeries: 'en série',
  inParallel: 'en parallèle',
  strings: 'chaînes',
  stringOf: 'chaîne de',
  stringsOf: 'chaînes de',
  modules: 'modules',
  inParallelUnits: 'en parallèle',
  acBoard: 'Tableau AC',
  mainEarthTerminal: 'Borne principale de terre',
  conductorDc: 'Liaison continue',
  titleRevision: 'Version',
  moreStrings: 'chaînes identiques',
};

export const EN_LABELS: DiagramLabels = {
  decimal: '.',
  pvField: 'PV array',
  pvFieldOf: 'Array of',
  modulesOf: 'modules of',
  stringFuse: 'String fuse gPV',
  combiner: 'Combiner box',
  spdType2: 'Type 2 surge arrester',
  dcSwitch: 'DC isolator',
  chargeController: 'Charge controller',
  inverter: 'Inverter',
  batteryBank: 'Battery bank',
  batteryBreaker: 'DC breaker',
  usefulEnergy: 'useful kWh',
  units: 'units',
  acBreaker: 'AC breaker',
  acSpd: 'AC surge arrester',
  rcd: 'RCD 30 mA',
  busbar: 'Busbar',
  meter: 'Energy meter',
  transferSwitch: 'Transfer switch',
  generator: 'Generator set',
  grid: 'Utility grid',
  loadBuilding: 'Site loads',
  loadPump: 'Pump',
  loadStreetLight: 'Luminaire',
  earthBar: 'Earth terminal bar',
  earthCutoff: 'Test link',
  earthElectrode: 'Earth electrode',
  toBeDefined: 'to be defined',
  legend: 'Legend',
  conductorPlus: 'DC conductor +',
  conductorMinus: 'DC conductor −',
  conductorAc: 'AC link',
  conductorEarth: 'Protective conductor (PE)',
  titleSheet: 'SINGLE-LINE DIAGRAM',
  titleCompany: 'Company',
  titleProject: 'Project',
  titleClient: 'Client',
  titleReference: 'Reference',
  titleLocation: 'Location',
  titleDate: 'Date',
  titleAuthor: 'Author',
  titlePlate: 'Sheet',
  bomReference: 'Item',
  bomDesignation: 'Designation',
  bomCharacteristic: 'Rating',
  bomQuantity: 'Qty',
  bomLocation: 'Grid ref.',
  fuseSwitch: 'Fuse switch-disconnector',
  dcBreaker: 'DC breaker',
  unit: 'unit',
  inSeries: 'in series',
  inParallel: 'in parallel',
  strings: 'strings',
  stringOf: 'string of',
  stringsOf: 'strings of',
  modules: 'modules',
  inParallelUnits: 'in parallel',
  acBoard: 'AC board',
  mainEarthTerminal: 'Main earthing terminal',
  conductorDc: 'DC link',
  titleRevision: 'Revision',
  moreStrings: 'identical strings',
};
