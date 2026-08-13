/**
 * Le contrat de calcul. **Une vue ne calcule jamais rien** : elle demande ici.
 *
 * Aujourd'hui une seule implémentation, `MockEngine`, dont les formules sont
 * simplifiées et parfois fausses. Le jour où le vrai moteur arrive, il implémente
 * cette interface et on change la ligne d'injection de `engine/index.ts`. Aucune vue
 * ne bouge.
 */

import type {
  BatteryRef,
  CableChoice,
  InverterRef,
  ModuleRef,
  Project,
} from '../domain/types';

// ------------------------------------------------------------------ Résultats

export interface LoadLine {
  id: string;
  name: string;
  /** Nombre d'unités — « 24 lampes », pas « 1 ligne ». */
  qty: number;
  totalPower: number; // W
  realPower: number; // W
  energy: number; // Wh/j
  peakPower: number; // W — démarrage inclus pour les inductifs
}

export interface LoadBalance {
  classic: LoadLine[];
  inductive: LoadLine[];
  totalPowerW: number;
  realPowerW: number;
  peakPowerW: number;
  dailyEnergyWh: number;
  qualityFactor: number; // γ = puissance moyenne / puissance de pointe horaire
  meanPowerKw: number;
  peakHourKw: number;
  peakHourIndex: number;
  hourlyKw: number[]; // 24 valeurs
  /** Appel de pointe horaire, démarrage des inductifs inclus (24 valeurs, kW).
      C'est ce que l'onduleur doit encaisser, pas ce que le site consomme. */
  hourlyPeakKw: number[];
}

/**
 * Résultat du prédimensionnement — les minimums que le dimensionnement devra
 * couvrir.
 *
 * Le moteur Python ne calcule qu'un seul système : `calculate_pre_sizing`
 * porte en docstring « 100% is ALWAYS calculated ». Les autres couvertures
 * n'étaient qu'une règle de trois appliquée après coup dans
 * `_generate_and_emit_all_results`, sans nouvelle simulation — LPSP, LOLP,
 * SRI et SVI y étaient recopiés à l'identique. La couverture est donc
 * implicitement totale, et le champ a disparu.
 *
 * Les noms portent « minimal » parce que c'est ce que `pcMin`, `stMin`,
 * `cbatMin` et `pInvMin` désignent dans `OptimalResultConstants` : un
 * plancher que l'étape suivante doit atteindre avec du matériel réel, jamais
 * un appareil choisi.
 */
export interface Presizing {
  /** `pcMin` — puissance crête du champ PV à installer au minimum. */
  minPvPeakKwc: number;
  /** `stMin` — énergie à stocker au minimum. */
  minStorageKwh: number;
  /** `pInvMin` — puissance minimale de l'onduleur. */
  minInverterKw: number;
  /** `alphaA` — surdimensionnement du stockage favorable retenu par le balayage. */
  alphaFavorable: number;
  /** `alphaN` — surdimensionnement du stockage défavorable retenu. */
  alphaUnfavorable: number;
  /** Nombre de combinaisons (α_f, α_nf) évaluées pour arriver là. */
  evaluatedConfigs: number;
  annualProductionKwh: number;
  lpsp: number; // %
  lolp: number; // %
  sri: number;
  sriThreshold: number;
  svi: number;
  lcoeActualized: number; // devise/kWh
  totalTtc: number;
  co2AvoidedKg: number;
  reliable: boolean;
  /** SVI < 1 : le kWh produit revient moins cher que le tarif de référence.
      C'est une lecture économique, jamais un blocage. */
  viable: boolean;
}

export interface ArrayConfig {
  series: number;
  parallel: number;
  count: number;
  requiredW: number;
  obtainedW: number;
  reservePercent: number;
}

export interface BankConfig {
  series: number;
  parallel: number;
  count: number;
  requiredAh: number;
  obtainedAh: number;
  reservePercent: number;
}

export interface InverterConfig {
  count: number;
  requiredW: number;
  obtainedW: number;
  reservePercent: number;
}

export interface Constraint {
  id: string;
  label: string;
  satisfied: boolean;
  detail: string;
}

/**
 * Un onduleur candidat, avec la configuration complète qu'il impose.
 *
 * Dans le logiciel, `get_compatible_inverters` ne renvoie pas des onduleurs
 * mais des `StandalonePVSystemSizingResultsModel` : chaque candidat arrive
 * avec son `ns_pv_array`, `np_pv_array`, `ns_batt`, `np_batt` et `inv_number`.
 * Le câblage du champ et du parc n'est donc pas une décision séparée — il est
 * attaché à l'onduleur retenu. Notre interface les présentait comme trois
 * arrangements indépendants ; ils n'en font qu'un.
 */
export interface InverterCandidate {
  inverter: InverterRef;
  /** Nombre d'onduleurs en parallèle (`inv_number`). */
  count: number;
  obtainedW: number;
  reservePercent: number;
  pvSeries: number;
  pvParallel: number;
  pvObtainedW: number;
  bankSeries: number;
  bankParallel: number;
  bankObtainedAh: number;
  /** Tension du parc batteries qui découle du montage (`ns_batt × V_unité`). */
  bankVoltage: number;
}

/** Ce que le moteur peut proposer, et pourquoi il n'a rien à proposer. */
export interface CompatibilityResult {
  candidates: InverterCandidate[];
  /** Références examinées dans la base. */
  examined: number;
  /** Bornes de puissance appliquées au filtre, en W. */
  powerMinW: number;
  powerMaxW: number;
  /** Tension continue minimale exigée par la batterie choisie. */
  minDcVoltage: number;
}

export interface SizingResult {
  module: ModuleRef | null;
  battery: BatteryRef | null;
  inverter: InverterRef | null;
  pvArray: ArrayConfig | null;
  bank: BankConfig | null;
  inverters: InverterConfig | null;
  constraints: Constraint[];
  stringVoltageVoc: number;
  stringVoltageVmp: number;
  annualProductionKwh: number;
}

/**
 * La simulation du système retenu — la boucle de vérification.
 *
 * Le prédimensionnement fixe un plancher théorique ; le matériel réel est
 * toujours un peu au-dessus, parce que modules, batteries et onduleurs
 * n'existent qu'en tailles discrètes. Cette passe recalcule ce que vaut le
 * système réellement monté : puissances installées, production, fiabilité.
 *
 * Rien d'économique ici, volontairement : les prix ne sont définis qu'à
 * l'étape du chiffrage, donc un LCOE « réel » n'existe pas encore quand ce
 * résultat s'affiche. La comparaison économique vit sur la page chiffrage.
 */
export interface Verification {
  /** Puissance crête réellement installée (`pvArray.obtainedW`). */
  pvPeakKwc: number;
  /** Énergie stockée réellement installée (`bank.obtainedAh × tension du parc`). */
  storageKwh: number;
  /** Puissance onduleur réellement installée. */
  inverterKw: number;
  annualProductionKwh: number;
  lpsp: number; // %
  lolp: number; // %
  sri: number;
  sriThreshold: number;
  /** SRI au-dessus du seuil et toutes les contraintes matérielles satisfaites. */
  reliable: boolean;
}

export interface CableResult {
  segment: CableChoice['segment'];
  currentA: number;
  voltageV: number;
  dropPercent: number;
  minimalSection: number; // mm²
  normalizedSection: number; // mm²
}

export interface ProtectionResult {
  segment: CableChoice['segment'];
  kind: string;
  caliberA: number;
  serviceVoltageV: number;
  quantity: number;
  exact: boolean; // false = repli sur la valeur calculée, aucun calibre normalisé
  /** Courant minimal à couvrir, avant normalisation. */
  requiredA: number;
  /** Calibres normalisés admissibles, dans l'ordre. Le premier est conseillé. */
  options: number[];
  /** true si l'utilisateur a écarté la valeur conseillée. */
  overridden: boolean;
}

export interface CostLine {
  key: string;
  label: string;
  quantity: number;
  unitCost: number;
  marginPercent: number;
  totalCost: number;
  totalSale: number;
}

export interface CostingResult {
  lines: CostLine[];
  totalCost: number;
  grossSaleHt: number;
  discount: number;
  totalSaleHt: number;
  profit: number;
  averageMarginPercent: number;
  tvaAmount: number;
  totalTtc: number;
  downPayment: number;
  balanceDue: number;
  wattPeakPrice: number;
  lcoeSimple: number;
  totalPowerWc: number;
}

export interface LifecycleResult {
  capex: number;
  lcoeActualized: number;
  co2AvoidedKg: number;
  co2AvoidedTrees: number;
  dieselEquivalentCost: number;
  annualMaintenanceCost: number;
  totalReplacementCost: number;
  totalLifecycleCost: number;
  actualizedEnergyKwh: number;
}

/** Ce que le panneau verdict affiche en permanence. */
export interface Verdict {
  svi: number;
  sri: number;
  sriThreshold: number;
  viable: boolean;
  reliable: boolean;
  lpsp: number;
  lolp: number;
  pvPeakKwc: number;
  storageKwh: number;
  inverterKw: number;
  annualProductionKwh: number;
  lcoeActualized: number;
  wattPeakPrice: number;
  totalTtc: number;
  co2AvoidedKg: number;
  blockingIssues: Constraint[];
  /**
   * D'où viennent les valeurs. `theoretical` : tout vient du
   * prédimensionnement, sur le système minimal. `simulated` : la sélection
   * est complète et les grandeurs physiques (puissances, production,
   * fiabilité) sont celles du matériel réellement retenu. L'économie ne
   * devient réelle qu'au chiffrage — c'est là que la comparaison
   * théorique/réel s'affiche.
   */
  source: 'theoretical' | 'simulated';
}

// ------------------------------------------------------------------ Contrat

export interface SizingEngine {
  /** Bilan des charges du profil actif. */
  loadBalance(project: Project): LoadBalance;

  /** Les minimums que le dimensionnement devra couvrir. */
  presize(project: Project): Presizing;

  /**
   * Les onduleurs que la base peut proposer pour le module et la batterie
   * déjà choisis. Renvoie une liste vide tant que l'un des deux manque :
   * `_trigger_inverter_compatibility_check` s'arrête à
   * « if not module or not battery: continue ».
   */
  compatibleInverters(project: Project): CompatibilityResult;

  /** Dimensionnement sur le matériel réellement sélectionné. */
  size(project: Project): SizingResult;

  /**
   * Ce que vaut le système retenu, comparé au plancher du prédimensionnement.
   * Renvoie `null` tant que module, batterie ou onduleur manque : il n'y a
   * alors pas de système à vérifier.
   */
  verify(project: Project): Verification | null;

  cables(project: Project): CableResult[];
  protections(project: Project): ProtectionResult[];
  costing(project: Project): CostingResult;
  lifecycle(project: Project): LifecycleResult;

  /** Agrégat prêt à afficher — c'est ce que consomme le panneau verdict. */
  verdict(project: Project): Verdict;
}
