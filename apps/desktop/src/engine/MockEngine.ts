/**
 * Implémentation SIMULÉE de `SizingEngine`.
 *
 * ⚠ Les formules sont simplifiées et certaines sont fausses. Elles ont deux qualités,
 * et deux seulement :
 *   1. elles réagissent réellement aux entrées — ajouter un congélateur fait bouger
 *      le prix, baisser la couverture fait tomber la fiabilité ;
 *   2. elles sont déterministes et cohérentes entre elles d'un écran à l'autre.
 *
 * Les constantes marquées CALIBRAGE sont là pour que le projet de référence
 * (centre de santé de Bombouaka) retombe sur les valeurs des maquettes. Elles
 * disparaîtront avec le vrai moteur.
 */

import type {
  BatteryRef,
  CableChoice,
  InverterRef,
  ModuleRef,
  NamedProfile,
  Project,
} from '../domain/types';
import { batteries, inverters, modules } from '../data/reference';
import type {
  ArrayConfig,
  BankConfig,
  CableResult,
  CompatibilityResult,
  Constraint,
  CostLine,
  CostingResult,
  InverterConfig,
  InverterCandidate,
  LifecycleResult,
  LoadBalance,
  LoadLine,
  ProtectionResult,
  Presizing,
  SizingEngine,
  SizingResult,
  Verdict,
  Verification,
} from './SizingEngine';

// ---------------------------------------------------------------- Constantes

/** CALIBRAGE — marge de conception appliquée à la puissance crête. */
const PV_DESIGN_MARGIN = 1.1;
/** CALIBRAGE — part de l'énergie qui transite par le stockage. */
const STORED_FRACTION = 0.6;
/** CALIBRAGE — jours d'autonomie utile. */
const AUTONOMY_DAYS = 1.374;
/** CALIBRAGE — réserve de puissance de l'onduleur sur la pointe. */
const INVERTER_MARGIN = 1.2;
/** CALIBRAGE — LPSP du système prédimensionné. La dérive quadratique servait
    à dégrader la fiabilité des couvertures partielles ; le moteur Python ne
    la simule pas — il recopie LPSP à l'identique — et ces couvertures ont
    disparu avec elle. */
const LPSP_BASE = 2.8;
const LOLP_RATIO = 1.107;
/** CALIBRAGE — pas de fiabilité gagnée par point de réserve installée au-delà
    du minimum. Sert uniquement à `verify` : le vrai moteur rejouera le bilan
    horaire sur l'année ; ici on dégrade LPSP_BASE d'un facteur proportionnel
    à la réserve du stockage et du champ, qui sont les deux leviers de la
    fiabilité. Plafonné pour ne jamais annoncer un LPSP nul. */
const RELIABILITY_GAIN_PER_RESERVE = 0.5;
const LPSP_FLOOR = 0.4;
/** Repli quand la base ne renseigne pas la mise en parallèle. */
const MAX_PARALLEL_FALLBACK = 6;
/** `ci_dg` par défaut de `LifecycleParams` — les dossiers enregistrés avant
    l'ajout du réglage n'en portent pas. */
const DIESEL_SPECIFIC_COST = 300000;

const RHO_COPPER = 0.01724; // Ω·mm²/m
const RHO_ALU = 0.0282;
const FUSE_CALIBERS = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
const BREAKER_CALIBERS = [
  16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
];
const SERVICE_VOLTAGES = [250, 400, 600, 800, 1000];
const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

const nextUp = (value: number, ladder: number[]): number =>
  ladder.find((v) => v >= value) ?? ladder[ladder.length - 1];

const round = (v: number, d = 2): number => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

// ---------------------------------------------------------------- Utilitaires

const activeProfile = (p: Project): NamedProfile =>
  p.load.profiles.find((x) => x.id === p.load.activeProfileId) ?? p.load.profiles[0];

const findModule = (id: string | null): ModuleRef | null =>
  id ? (modules.find((m) => m.id === id) ?? null) : null;
const findBattery = (id: string | null): BatteryRef | null =>
  id ? (batteries.find((b) => b.id === id) ?? null) : null;
const findInverter = (id: string | null): InverterRef | null =>
  id ? (inverters.find((i) => i.id === id) ?? null) : null;

/** Facteur d'annuité actualisée sur n années. */
const annuity = (rate: number, years: number): number =>
  rate === 0 ? years : (1 - (1 + rate) ** -years) / rate;

// ================================================================== Moteur

export class MockEngine implements SizingEngine {
  // ------------------------------------------------------------ Charges

  loadBalance(project: Project): LoadBalance {
    const profile = activeProfile(project);

    const classic: LoadLine[] = profile.classic.map((e) => {
      const totalPower = e.qty * e.unitPower;
      const realPower = e.yield > 0 ? totalPower / e.yield : 0;
      return {
        id: e.id,
        name: e.name,
        qty: e.qty,
        totalPower,
        realPower,
        energy: realPower * e.opHours,
        peakPower: realPower,
      };
    });

    const inductive: LoadLine[] = profile.inductive.map((e) => {
      const totalPower = e.qty * e.unitPower;
      const realPower = e.yield > 0 ? totalPower / e.yield : 0;
      return {
        id: e.id,
        name: e.name,
        qty: e.qty,
        totalPower,
        realPower,
        energy: realPower * e.opHours,
        peakPower: realPower * e.startupCoef,
      };
    });

    const all = [...classic, ...inductive];
    const totalPowerW = all.reduce((s, l) => s + l.totalPower, 0);
    const realPowerW = all.reduce((s, l) => s + l.realPower, 0);
    const peakPowerW = all.reduce((s, l) => s + l.peakPower, 0);
    const dailyEnergyWh = all.reduce((s, l) => s + l.energy, 0);

    const hourlyKw = this.hourlyShape(profile, dailyEnergyWh);
    const maxHour = Math.max(...hourlyKw, 0.0001);
    const meanHour = dailyEnergyWh / 1000 / 24;
    const peakHour = hourlyKw.indexOf(maxHour);

    /* Appel de pointe heure par heure. Le rapport pointe/réel du parc dit
       combien l'onduleur doit encaisser au-delà de la consommation : c'est
       l'écart que les deux niveaux de barres rendent visible. */
    const startupRatio = realPowerW > 0 ? peakPowerW / realPowerW : 1;
    const hourlyPeakKw = hourlyKw.map((v) => round(v * startupRatio, 2));

    return {
      classic,
      inductive,
      totalPowerW,
      realPowerW,
      peakPowerW,
      dailyEnergyWh,
      qualityFactor: round(meanHour / maxHour, 3),
      meanPowerKw: round(meanHour, 2),
      peakHourKw: round(maxHour, 2),
      peakHourIndex: peakHour,
      hourlyKw,
      hourlyPeakKw,
    };
  }

  /**
   * Forme horaire. En mode `hourly` on prend la saisie ; sinon on répartit l'énergie
   * sur une courbe type de centre de santé, renormalisée sur l'énergie réelle.
   */
  private hourlyShape(profile: NamedProfile, dailyEnergyWh: number): number[] {
    if (profile.source === 'hourly' && profile.hourly.length === 24) {
      return profile.hourly.map((h) => round(h.realPower, 2));
    }
    const shape = [
      0.4, 0.4, 0.4, 0.4, 0.4, 0.7, 1.0, 1.3, 1.7, 2.0, 2.1, 1.9, 1.5, 1.2, 1.3,
      1.3, 1.1, 0.95, 1.25, 1.45, 1.35, 0.95, 0.65, 0.55,
    ];
    const sum = shape.reduce((s, v) => s + v, 0);
    const k = dailyEnergyWh / 1000 / sum;
    return shape.map((v) => round(v * k, 2));
  }

  // ------------------------------------------------------------ Prédimensionnement

  /**
   * Un seul système, celui qui couvre la totalité du besoin.
   *
   * Le service Python balaie 121 couples (α_f, α_nf) et retient le SVI le plus
   * bas parmi les configurations fiables — `reliable_set` puis
   * `min(..., key=svi)`. On ne rejoue pas ce balayage ici : on expose le
   * couple retenu et les grandeurs qu'il commande, ce qui suffit à la maquette
   * et garde les mêmes noms qu'`OptimalResultConstants`.
   */
  presize(project: Project): Presizing {
    const balance = this.loadBalance(project);
    const a = project.assumptions;
    const site = project.site;

    const dailyKwh = balance.dailyEnergyWh / 1000;

    // Énergie à produire côté continu, pertes onduleur et aller-retour batterie
    const dcEnergy =
      (dailyKwh / (a.inverterYield / 100)) *
      (1 + STORED_FRACTION * (100 / a.batteryYield - 1));

    const irradiation = site.irradiation > 0 ? site.irradiation : 5;
    const minPvPeakKwc = round(
      (dcEnergy / (irradiation * (a.systemPr / 100))) * PV_DESIGN_MARGIN,
      2,
    );

    // Stockage installé = énergie utile / profondeur de décharge
    const minStorageKwh = round((dailyKwh * AUTONOMY_DAYS) / (a.batteryDod / 100), 2);

    const minInverterKw =
      Math.ceil(((balance.peakPowerW / 1000) * INVERTER_MARGIN) / 0.5) * 0.5;

    const annualProductionKwh = Math.round(
      minPvPeakKwc * irradiation * 365 * (a.systemPr / 100),
    );

    // Le couple retenu par le balayage des 121 combinaisons.
    const alphaFavorable = 0.4;
    const alphaUnfavorable = 0.6;

    const lpsp = round(LPSP_BASE, 1);
    const lolp = round(lpsp * LOLP_RATIO, 1);
    const sri = round((1 - lpsp / 100) * (1 - lolp / 100), 4);
    const sriThreshold = round((1 - a.lpspMax / 100) * (1 - a.lolpMax / 100), 4);

    const life = this.lifecycleFor(project, {
      pvPeakKwc: minPvPeakKwc,
      storageKwh: minStorageKwh,
      inverterKw: minInverterKw,
      annualProductionKwh,
    });

    const svi = round(life.lcoeActualized / (a.lcoeGrid || 1), 2);

    return {
      minPvPeakKwc,
      minStorageKwh,
      minInverterKw,
      alphaFavorable,
      alphaUnfavorable,
      evaluatedConfigs: 121,
      annualProductionKwh,
      lpsp,
      lolp,
      sri,
      sriThreshold,
      svi,
      lcoeActualized: round(life.lcoeActualized, 0),
      totalTtc: Math.round(life.capex * (1 + project.costing.tvaPercent / 100)),
      co2AvoidedKg: life.co2AvoidedKg,
      reliable: sri >= sriThreshold,
      viable: svi < 1,
    };
  }

  // ------------------------------------------------------------ Dimensionnement

  /**
   * Transposition de `get_compatible_inverters` (`core/services/sizing_service.py`).
   *
   * Le choix du matériel n'est pas symétrique dans le logiciel : le module et
   * la batterie se choisissent librement, l'onduleur se **déduit** des deux.
   * `_trigger_inverter_compatibility_check` refuse de travailler tant qu'il
   * manque l'un des deux, puis balaie toute la base d'onduleurs en appliquant
   * trois filtres, et renvoie pour chaque survivant une configuration complète
   * — champ PV et parc batteries compris.
   */
  compatibleInverters(project: Project): CompatibilityResult {
    const presizing = this.presize(project);
    const balance = this.loadBalance(project);
    const a = project.assumptions;

    const module = findModule(project.selection.moduleId);
    const battery = findBattery(project.selection.batteryId);

    /* Puissance que l'onduleur doit tenir : la pointe, réserve comprise. */
    const requiredW = balance.peakPowerW * INVERTER_MARGIN;

    /* Les bornes du service : `p_min = max(P_charge × 0.15, P_requis / 6)` écarte
       les onduleurs trop petits pour être mis en parallèle raisonnablement,
       `p_max = P_requis × 2.5` écarte le surdimensionnement absurde. */
    const powerMinW = Math.max(balance.realPowerW * 0.15, requiredW / 6);
    const powerMaxW = requiredW * 2.5;

    const empty: CompatibilityResult = {
      candidates: [],
      examined: inverters.length,
      powerMinW: Math.round(powerMinW),
      powerMaxW: Math.round(powerMaxW),
      minDcVoltage: 0,
    };
    if (!module || !battery) return empty;

    /* Tension continue du parc. `ns_batt` monte les unités en série jusqu'à la
       tension de service, et l'onduleur doit l'accepter. */
    const bankSeries = Math.max(1, Math.round(a.batteryVoltage / battery.voltage));
    const bankVoltage = round(bankSeries * battery.voltage, 1);

    const candidates: InverterCandidate[] = [];

    for (const inv of inverters) {
      if (inv.nominal_power < powerMinW) continue;
      if (inv.nominal_power > powerMaxW) continue;
      if (inv.nominal_dc_voltage < bankVoltage) continue;

      const count = Math.max(1, Math.ceil(requiredW / inv.nominal_power));
      const declared = inv.max_parallel_units ?? 0;
      const maxParallel = declared > 1 ? declared : MAX_PARALLEL_FALLBACK;
      if (count > maxParallel) continue;

      const obtainedW = count * inv.nominal_power;

      /* Le montage du champ dépend de l'onduleur candidat : c'est son plafond
         de tension à vide qui fixe le nombre de modules en série. */
      const ceiling = inv.pv_open_circuit_max_voltage ?? inv.mppt_max_voltage ?? 450;
      const pvSeries = Math.max(1, Math.floor((ceiling * 0.9) / module.voc_stc));
      const pvRequiredW = presizing.minPvPeakKwc * 1000;
      const pvParallel = Math.max(
        1,
        Math.ceil(pvRequiredW / (pvSeries * module.power)),
      );
      const pvObtainedW = pvSeries * pvParallel * module.power;

      /* L'onduleur doit encaisser le champ qu'il impose lui-même. */
      const pvAdmissible = (inv.pv_array_max_power ?? 0) * count;
      if (pvAdmissible > 0 && pvObtainedW > pvAdmissible) continue;

      /* `battery_capacity_required = (storage_kwh × 1000) / (v_park × dod)` —
         incalculable avant le choix de la batterie, puisque `v_park` en dépend. */
      const dod = (battery.max_dod || a.batteryDod || 80) / 100;
      const requiredAh = (presizing.minStorageKwh * 1000) / (bankVoltage * dod);
      const bankParallel = Math.max(1, Math.ceil(requiredAh / battery.capacity));
      const bankObtainedAh = bankParallel * battery.capacity;

      candidates.push({
        inverter: inv,
        count,
        obtainedW,
        reservePercent: round((obtainedW / (requiredW || 1) - 1) * 100, 1),
        pvSeries,
        pvParallel,
        pvObtainedW,
        bankSeries,
        bankParallel,
        bankObtainedAh,
        bankVoltage,
      });
    }

    /* La réserve la plus juste d'abord : c'est le matériel le mieux ajusté au
       besoin, donc le moins cher à couverture égale. */
    candidates.sort((x, y) => x.reservePercent - y.reservePercent);

    return { ...empty, candidates, minDcVoltage: bankVoltage };
  }

  size(project: Project): SizingResult {
    const presizing = this.presize(project);
    const balance = this.loadBalance(project);
    const a = project.assumptions;

    const module = findModule(project.selection.moduleId);
    const battery = findBattery(project.selection.batteryId);
    const inverter = findInverter(project.selection.inverterId);

    let pvArray: ArrayConfig | null = null;
    let stringVoltageVoc = 0;
    let stringVoltageVmp = 0;

    if (module) {
      // Tenue en tension : 90 % du plafond MPPT, garde-fou de température
      const ceiling =
        inverter?.pv_open_circuit_max_voltage ?? inverter?.mppt_max_voltage ?? 450;
      const series = Math.max(1, Math.floor((ceiling * 0.9) / module.voc_stc));
      const requiredW = presizing.minPvPeakKwc * 1000;
      const parallel = Math.max(1, Math.ceil(requiredW / (series * module.power)));
      const count = series * parallel;
      const obtainedW = count * module.power;
      pvArray = {
        series,
        parallel,
        count,
        requiredW: Math.round(requiredW),
        obtainedW,
        reservePercent: round((obtainedW / requiredW - 1) * 100, 1),
      };
      stringVoltageVoc = round(series * module.voc_stc, 1);
      stringVoltageVmp = round(series * module.vmp, 1);
    }

    let bank: BankConfig | null = null;
    if (battery) {
      const bankVoltage = a.batteryVoltage;
      const series = Math.max(1, Math.round(bankVoltage / battery.voltage));
      const requiredAh = (presizing.minStorageKwh * 1000) / bankVoltage;
      const parallel = Math.max(1, Math.ceil(requiredAh / battery.capacity));
      const obtainedAh = parallel * battery.capacity;
      bank = {
        series,
        parallel,
        count: series * parallel,
        requiredAh: Math.round(requiredAh),
        obtainedAh,
        reservePercent: round((obtainedAh / requiredAh - 1) * 100, 1),
      };
    }

    let inverterCfg: InverterConfig | null = null;
    if (inverter) {
      const requiredW = balance.peakPowerW;
      const count = Math.max(1, Math.ceil(requiredW / inverter.nominal_power));
      const obtainedW = count * inverter.nominal_power;
      inverterCfg = {
        count,
        requiredW: Math.round(requiredW),
        obtainedW,
        reservePercent: round((obtainedW / requiredW - 1) * 100, 1),
      };
    }

    return {
      module,
      battery,
      inverter,
      pvArray,
      bank,
      inverters: inverterCfg,
      constraints: this.constraints(project, {
        module,
        battery,
        inverter,
        pvArray,
        bank,
        inverterCfg,
        peakPowerW: balance.peakPowerW,
      }),
      stringVoltageVoc,
      stringVoltageVmp,
      annualProductionKwh: pvArray
        ? Math.round(
            (pvArray.obtainedW / 1000) *
              project.site.irradiation *
              365 *
              (a.systemPr / 100),
          )
        : 0,
    };
  }

  private constraints(
    project: Project,
    ctx: {
      module: ModuleRef | null;
      battery: BatteryRef | null;
      inverter: InverterRef | null;
      pvArray: ArrayConfig | null;
      bank: BankConfig | null;
      inverterCfg: InverterConfig | null;
      peakPowerW: number;
    },
  ): Constraint[] {
    const out: Constraint[] = [];
    const { inverter, pvArray, bank, inverterCfg } = ctx;
    if (!inverter || !inverterCfg) return out;

    const pvAdmissible = (inverter.pv_array_max_power ?? 0) * inverterCfg.count;
    out.push({
      id: 'pv_power',
      label: 'L’onduleur supporte la puissance totale du champ PV',
      satisfied: !pvArray || pvArray.obtainedW <= pvAdmissible,
      detail: `${Math.round(pvArray?.obtainedW ?? 0)} W pour ${Math.round(pvAdmissible)} W admissibles`,
    });

    const chargeOk =
      !bank ||
      (inverter.max_charging_current ?? 0) * inverterCfg.count * project.assumptions.batteryVoltage >=
        bank.obtainedAh * 0.1 * project.assumptions.batteryVoltage;
    out.push({
      id: 'battery_charge',
      label: 'L’onduleur supporte la charge du parc batteries',
      satisfied: chargeOk,
      detail: `${bank?.count ?? 0} unités à ${project.assumptions.batteryVoltage} V`,
    });

    // Les 84 onduleurs de la base portent tous `max_parallel_units = 1` : c'est une
    // valeur par défaut jamais renseignée, pas une caractéristique. On la traite comme
    // absente. Voir `donnees-a-completer.md`.
    const declared = inverter.max_parallel_units ?? 0;
    const maxParallel = declared > 1 ? declared : MAX_PARALLEL_FALLBACK;
    out.push({
      id: 'parallel',
      label: 'Les onduleurs sont en parallèle',
      satisfied: inverterCfg.count <= maxParallel,
      detail: `${inverterCfg.count} unités sur ${maxParallel} admissibles`,
    });

    // Pointe de démarrage : la surcharge disponible doit absorber le plus gros moteur
    const profile = activeProfile(project);
    const worst = profile.inductive.reduce(
      (best, e) => {
        const p = ((e.qty * e.unitPower) / (e.yield || 1)) * e.startupCoef;
        return p > best.p ? { p, name: e.name } : best;
      },
      { p: 0, name: '' },
    );
    const overload =
      (inverter.overload_power ?? inverter.nominal_power * 2) * inverterCfg.count;
    const headroom = overload - ctx.peakPowerW;
    out.push({
      id: 'startup',
      label: 'L’onduleur supporte le courant de démarrage des charges',
      satisfied: worst.p <= headroom,
      detail: worst.name
        ? `${Math.round(worst.p)} W de pointe (${worst.name}) pour ${Math.round(Math.max(headroom, 0))} W de réserve`
        : 'aucune charge inductive',
    });

    return out;
  }

  // ------------------------------------------------------------ Vérification

  /**
   * La boucle de vérification : ce que vaut le système retenu, mesuré contre
   * le plancher du prédimensionnement.
   *
   * Physique uniquement — pas de LCOE ici : les prix ne sont définis qu'au
   * chiffrage, une étape plus loin. La fiabilité réelle est dérivée de la
   * réserve que le matériel discret ajoute au-delà du minimum (logique mock,
   * marquée CALIBRAGE ; le vrai moteur rejouera le bilan horaire annuel).
   */
  verify(project: Project): Verification | null {
    const sel = project.selection;
    if (!sel.moduleId || !sel.batteryId || !sel.inverterId) return null;

    const sizing = this.size(project);
    if (!sizing.pvArray || !sizing.bank || !sizing.inverters) return null;

    const a = project.assumptions;
    const presizing = this.presize(project);

    const pvPeakKwc = round(sizing.pvArray.obtainedW / 1000, 2);
    const storageKwh = round(
      (sizing.bank.obtainedAh * a.batteryVoltage) / 1000,
      1,
    );
    const inverterKw = round(sizing.inverters.obtainedW / 1000, 1);

    /* La réserve qui compte pour la fiabilité est celle du stockage et du
       champ : l'onduleur ne stocke rien, il ne fait que passer la pointe. */
    const reserve =
      (sizing.pvArray.reservePercent + sizing.bank.reservePercent) / 200;
    const lpsp = round(
      Math.max(LPSP_FLOOR, LPSP_BASE * (1 - reserve * RELIABILITY_GAIN_PER_RESERVE)),
      1,
    );
    const lolp = round(lpsp * LOLP_RATIO, 1);
    const sri = round((1 - lpsp / 100) * (1 - lolp / 100), 4);

    return {
      pvPeakKwc,
      storageKwh,
      inverterKw,
      annualProductionKwh: sizing.annualProductionKwh,
      lpsp,
      lolp,
      sri,
      sriThreshold: presizing.sriThreshold,
      reliable:
        sri >= presizing.sriThreshold &&
        sizing.constraints.every((c) => c.satisfied),
    };
  }

  // ------------------------------------------------------------ Câbles

  cables(project: Project): CableResult[] {
    const protections = this.protections(project);

    // Chute de tension admissible par segment
    const drop: Record<CableChoice['segment'], number> = {
      pv_inverter: 1.5,
      inverter_battery: 1,
      inverter_load: 1,
    };

    return project.cables.map((c) => {
      const rho = c.material === 'copper' ? RHO_COPPER : RHO_ALU;
      // Le câble est dimensionné pour le calibre de la protection amont, pas
      // pour le courant nominal : c'est la protection qui borne ce que le
      // conducteur peut voir passer avant coupure. `ksd_app` fait de même —
      // `cabling_vm.load_system_data({'current': caliber, …})`.
      const p = protections.find((x) => x.segment === c.segment);
      const current = p?.caliberA ?? 0;
      const voltage = p?.serviceVoltageV || 1;

      const dropPercent = drop[c.segment];
      const minimal =
        (2 * rho * c.length * current) / ((dropPercent / 100) * voltage);
      return {
        segment: c.segment,
        currentA: round(current, 1),
        voltageV: round(voltage, 1),
        dropPercent,
        minimalSection: round(minimal, 1),
        normalizedSection: nextUp(minimal, SECTIONS),
      };
    });
  }

  protections(project: Project): ProtectionResult[] {
    const sizing = this.size(project);
    const presizing = this.presize(project);
    const a = project.assumptions;
    const out: ProtectionResult[] = [];

    /**
     * Assemble une ligne de protection. Le calibre conseillé est le premier
     * standard qui couvre le courant requis ; l'utilisateur peut lui préférer
     * un autre calibre admissible, auquel cas la ligne est marquée comme
     * écartée et le câble aval est redimensionné en conséquence.
     */
    const line = (
      segment: ProtectionResult['segment'],
      kind: string,
      required: number,
      catalogue: number[],
      serviceVoltageV: number,
      quantity: number,
    ): ProtectionResult => {
      const options = catalogue.filter((c) => c >= required);
      const advised = options[0] ?? round(required, 2);
      const chosen = project.protections?.find((p) => p.segment === segment)?.caliberA ?? null;
      const caliberA = chosen !== null && options.includes(chosen) ? chosen : advised;
      return {
        segment,
        kind,
        caliberA,
        serviceVoltageV,
        quantity,
        exact: options.length > 0,
        requiredA: round(required, 2),
        options,
        overridden: caliberA !== advised,
      };
    };

    if (sizing.module && sizing.pvArray) {
      out.push(
        line(
          'pv_inverter',
          'Fusible gPV',
          sizing.module.isc_stc * 1.25,
          FUSE_CALIBERS,
          nextUp(sizing.stringVoltageVoc * 1.2, SERVICE_VOLTAGES),
          sizing.pvArray.parallel,
        ),
      );
    }

    out.push(
      line(
        'inverter_battery',
        'Disjoncteur DC',
        (presizing.minInverterKw * 1000) / a.batteryVoltage,
        BREAKER_CALIBERS,
        a.batteryVoltage,
        1,
      ),
    );

    const ac = sizing.inverter?.nominal_ac_voltage ?? 230;
    out.push(
      line(
        'inverter_load',
        'Disjoncteur AC',
        (presizing.minInverterKw * 1000) / ac,
        BREAKER_CALIBERS,
        ac,
        1,
      ),
    );

    return out;
  }

  // ------------------------------------------------------------ Chiffrage

  costing(project: Project): CostingResult {
    const c = project.costing;
    const sizing = this.size(project);

    const main: CostLine[] = [
      {
        key: 'modules',
        label: 'Modules photovoltaïques',
        quantity: sizing.pvArray?.count ?? 0,
        unitCost: c.moduleUnitPrice,
        marginPercent: c.moduleMargin,
        totalCost: 0,
        totalSale: 0,
      },
      {
        key: 'batteries',
        label: 'Batteries',
        quantity: sizing.bank?.count ?? 0,
        unitCost: c.batteryUnitPrice,
        marginPercent: c.batteryMargin,
        totalCost: 0,
        totalSale: 0,
      },
      {
        key: 'inverters',
        label: 'Onduleurs',
        quantity: sizing.inverters?.count ?? 0,
        unitCost: c.inverterUnitPrice,
        marginPercent: c.inverterMargin,
        totalCost: 0,
        totalSale: 0,
      },
    ];
    for (const l of main) {
      l.totalCost = l.quantity * l.unitCost;
      l.totalSale = l.totalCost * (1 + l.marginPercent / 100);
    }
    const mainCost = main.reduce((s, l) => s + l.totalCost, 0);

    const accessory = (
      key: string,
      label: string,
      price: number,
      margin: number,
    ): CostLine => {
      const totalCost = c.definedCostForAccessories
        ? price
        : (mainCost * price) / 100;
      return {
        key,
        label,
        quantity: 1,
        unitCost: totalCost,
        marginPercent: margin,
        totalCost,
        totalSale: totalCost * (1 + margin / 100),
      };
    };

    const lines: CostLine[] = [
      ...main,
      accessory('cabling', 'Câblage et cheminements', c.cablingPrice, c.cablingMargin),
      accessory(
        'box',
        'Coffret électrique et protections',
        c.electricalBoxPrice,
        c.electricalBoxMargin,
      ),
      accessory(
        'supports',
        'Supports modules et batteries',
        c.supportsPrice,
        c.supportsMargin,
      ),
      accessory('transport', 'Transport et logistique', c.transportPrice, c.transportMargin),
      accessory(
        'installation',
        'Installation et mise en service',
        c.installationPrice,
        c.installationMargin,
      ),
      ...c.additional.map((e) => ({
        key: `add-${e.id}`,
        label: e.name,
        quantity: e.quantity,
        unitCost: e.costPrice,
        marginPercent: e.marginPercent,
        totalCost: e.costPrice * e.quantity,
        totalSale: e.costPrice * e.quantity * (1 + e.marginPercent / 100),
      })),
    ];

    const totalCost = lines.reduce((s, l) => s + l.totalCost, 0);
    const grossSaleHt = lines.reduce((s, l) => s + l.totalSale, 0);
    const discount = (grossSaleHt * c.reductionPercent) / 100;
    const totalSaleHt = grossSaleHt - discount;
    const profit = totalSaleHt - totalCost;
    const tvaAmount = (totalSaleHt * c.tvaPercent) / 100;
    const totalTtc = totalSaleHt + tvaAmount;
    const totalPowerWc = sizing.pvArray?.obtainedW ?? 0;
    const annual = sizing.annualProductionKwh;
    const life = project.assumptions.projectLifetime;

    return {
      lines,
      totalCost,
      grossSaleHt,
      discount,
      totalSaleHt,
      profit,
      averageMarginPercent: totalCost > 0 ? (profit / totalCost) * 100 : 0,
      tvaAmount,
      totalTtc,
      downPayment: (totalTtc * c.downPaymentPercent) / 100,
      balanceDue: totalTtc - (totalTtc * c.downPaymentPercent) / 100,
      wattPeakPrice: totalPowerWc > 0 ? totalTtc / totalPowerWc : 0,
      lcoeSimple: annual > 0 ? totalTtc / (annual * life) : 0,
      totalPowerWc,
    };
  }

  // ------------------------------------------------------------ Cycle de vie

  lifecycle(project: Project): LifecycleResult {
    const s = this.presize(project);
    const c = this.costing(project);
    /* Dès que le trio module/batterie/onduleur est choisi, le cycle de vie
       porte sur le système réel : c'est sa production — pas celle du
       plancher théorique — qui amortit l'investissement. Le TTC vient déjà
       du chiffrage. */
    const v = this.verify(project);
    if (v) {
      return this.lifecycleFor(
        project,
        {
          pvPeakKwc: v.pvPeakKwc,
          storageKwh: v.storageKwh,
          inverterKw: v.inverterKw,
          annualProductionKwh: v.annualProductionKwh,
        },
        c.totalTtc,
      );
    }
    return this.lifecycleFor(project, {
      pvPeakKwc: s.minPvPeakKwc,
      storageKwh: s.minStorageKwh,
      inverterKw: s.minInverterKw,
      annualProductionKwh: s.annualProductionKwh,
    }, c.totalTtc);
  }

  /** Séparé de `lifecycle` pour être appelable pendant le prédimensionnement. */
  private lifecycleFor(
    project: Project,
    sys: {
      pvPeakKwc: number;
      storageKwh: number;
      inverterKw: number;
      annualProductionKwh: number;
    },
    initialInvestmentTtc?: number,
  ): LifecycleResult {
    const a = project.assumptions;
    const rate = a.actualizationRate / 100;
    const life = a.projectLifetime;

    const capexPv = sys.pvPeakKwc * a.pvSpecificCost * (1 + a.pvMargin / 100);
    const capexBat =
      sys.storageKwh * a.batterySpecificCost * (1 + a.batteryMargin / 100);
    const capexInv =
      sys.inverterKw * a.inverterSpecificCost * (1 + a.inverterMargin / 100);
    const capex = capexPv + capexBat + capexInv;

    const replacementsFor = (cost: number, lifetime: number): number => {
      let total = 0;
      for (let y = lifetime; y < life; y += lifetime) {
        total += cost;
      }
      return total;
    };
    const actualizedReplacementsFor = (cost: number, lifetime: number): number => {
      let total = 0;
      for (let y = lifetime; y < life; y += lifetime) {
        total += cost / (1 + rate) ** y;
      }
      return total;
    };
    const totalReplacementCost =
      replacementsFor(capexBat, a.batteryLifetime) +
      replacementsFor(capexInv, a.inverterLifetime);
    const actualizedReplacementCost =
      actualizedReplacementsFor(capexBat, a.batteryLifetime) +
      actualizedReplacementsFor(capexInv, a.inverterLifetime);

    const annualMaintenanceCost =
      (capexPv * a.pvMaintenance) / 100 +
      (capexBat * a.batteryMaintenance) / 100 +
      (capexInv * a.inverterMaintenance) / 100;

    const af = annuity(rate, life);
    // Le service Python prend le prix de vente TTC comme investissement
    // initial du cycle de vie. Les coûts techniques servent aux calculs de
    // maintenance et de remplacement, mais ne remplacent pas le prix vendu.
    // Le prédimensionnement appelle ce calcul avant que le chiffrage ne
    // puisse connaître les quantités retenues. Dans ce cas, le coût technique
    // sert de base provisoire ; l'appel public `lifecycle` le remplace par le
    // prix de vente TTC calculé après le dimensionnement.
    const initialTtc = initialInvestmentTtc ?? capex;
    const totalLifecycleCost =
      initialTtc + totalReplacementCost + annualMaintenanceCost * life;
    const actualizedLifecycleCost =
      initialTtc + actualizedReplacementCost + annualMaintenanceCost * af;
    const actualizedEnergyKwh = sys.annualProductionKwh * af;
    const lcoeActualized =
      actualizedEnergyKwh > 0 ? actualizedLifecycleCost / actualizedEnergyKwh : 0;

    const co2AvoidedKg =
      sys.annualProductionKwh * a.emissionFactor * life * (a.autoConsumptionRate / 100);

    return {
      capex: Math.round(capex),
      lcoeActualized,
      co2AvoidedKg: Math.round(co2AvoidedKg),
      co2AvoidedTrees: Math.round(co2AvoidedKg / 22),
      /* `compute_diesel_equivalent` : `total_power_kw × ci_dg`, où `ci_dg`
         vaut 300 000 FCFA/kW par défaut. C'est un **coût d'investissement**
         pour une puissance équivalente, pas un coût d'exploitation sur 25 ans
         — le carburant et l'entretien n'y sont pas.

         On affichait ici `totalLifecycleCost × 2,07`, un facteur inventé qui
         faisait passer cette valeur pour un cycle de vie diesel. Comparée au
         cycle de vie solaire, elle produisait une « économie » qui ne voulait
         rien dire. */
      dieselEquivalentCost: Math.round(
        sys.inverterKw * (a.dieselSpecificCost || DIESEL_SPECIFIC_COST),
      ),
      annualMaintenanceCost: Math.round(annualMaintenanceCost),
      totalReplacementCost: Math.round(totalReplacementCost),
      totalLifecycleCost: Math.round(totalLifecycleCost),
      actualizedEnergyKwh: Math.round(actualizedEnergyKwh),
    };
  }

  // ------------------------------------------------------------ Verdict

  verdict(project: Project): Verdict {
    const s = this.presize(project);
    const costing = this.costing(project);
    const life = this.lifecycle(project);
    const sizing = this.size(project);
    const v = this.verify(project);

    return {
      svi: s.svi,
      sri: v?.sri ?? s.sri,
      sriThreshold: s.sriThreshold,
      viable: s.viable,
      reliable: v?.reliable ?? s.reliable,
      lpsp: v?.lpsp ?? s.lpsp,
      lolp: v?.lolp ?? s.lolp,
      pvPeakKwc: v?.pvPeakKwc ?? s.minPvPeakKwc,
      storageKwh: v?.storageKwh ?? s.minStorageKwh,
      inverterKw: v?.inverterKw ?? s.minInverterKw,
      annualProductionKwh:
        v?.annualProductionKwh || sizing.annualProductionKwh || s.annualProductionKwh,
      lcoeActualized: Math.round(life.lcoeActualized),
      wattPeakPrice: costing.wattPeakPrice,
      totalTtc: costing.totalTtc,
      co2AvoidedKg: life.co2AvoidedKg,
      blockingIssues: sizing.constraints.filter((c) => !c.satisfied),
      source: v ? 'simulated' : 'theoretical',
    };
  }
}
