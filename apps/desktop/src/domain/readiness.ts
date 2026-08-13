/**
 * Ce qui existe, et à partir de quand.
 *
 * Le moteur répond toujours : `verdict(project)` fabrique un SVI même sur un
 * dossier vide, parce qu'il applique ses formules à des zéros. L'interface
 * affichait donc « NON VIABLE 1,05 » sur un projet qu'on venait d'ouvrir —
 * un verdict sans site, sans besoins et sans matériel.
 *
 * Le logiciel Python ne fait jamais cela. Page 2, les StatCards partent à
 * `value="N/A"` ; page 3, le panneau affiche « Click 'Run Sizing' to see
 * results » tant que `run_sizing_calculation` n'a pas tourné. Il attend.
 *
 * Ce module transpose cette attente : il dit, pour chaque famille de valeurs,
 * si elle est calculable, et sinon ce qu'il manque.
 */

import type { Project } from './types';
import { engine } from '../engine';

export interface Gate {
  /** La donnée peut être affichée. */
  ready: boolean;
  /** Ce qu'il reste à faire pour l'obtenir, en clair. */
  waiting: string;
  /** L'étape où se fait ce travail, pour y renvoyer d'un clic. */
  slug: string;
}

export interface Readiness {
  /** Bilan des charges : dès que le profil porte de l'énergie. */
  load: Gate;
  /** Fiabilité et minimums : après le passage du prédimensionnement. */
  presizing: Gate;
  /** Requis / obtenu : après le dimensionnement sur matériel réel. */
  sizing: Gate;
  /** Prix de revient, prix du Wc, TTC : après la saisie du chiffrage. */
  costing: Gate;
}

const gate = (ready: boolean, waiting: string, slug: string): Gate => ({
  ready,
  waiting,
  slug,
});

export function readiness(project: Project): Readiness {
  const balance = engine.loadBalance(project);
  const site = project.site;
  const sel = project.selection;
  const k = project.costing;

  const hasLoad = balance.dailyEnergyWh > 0 && balance.peakPowerW > 0;
  const hasSite = site.irradiation > 0;

  /* Le prédimensionnement a besoin des deux entrées que `calculate_pre_sizing`
     vérifie avant de lancer son worker : un profil de charge non vide, et une
     irradiation strictement positive. */
  const presizingReady = hasLoad && hasSite;

  /* Le dimensionnement exige les trois composants. `run_sizing_calculation`
     saute la couverture dès qu'il en manque un :
     « if not all([module, battery, inverter]) ». */
  const hasAllRefs = Boolean(sel.moduleId && sel.batteryId && sel.inverterId);

  /* Le chiffrage n'a de sens qu'avec des prix unitaires saisis. Un prix du Wc
     calculé sur les valeurs par défaut est un devis que personne n'a établi. */
  const hasPrices =
    k.moduleUnitPrice > 0 && k.batteryUnitPrice > 0 && k.inverterUnitPrice > 0;

  return {
    load: gate(hasLoad, 'Saisissez les besoins électriques', 'besoins'),
    presizing: gate(
      presizingReady,
      /* Quand les entrées sont là, il ne manque plus que le geste : le calcul
         ne part jamais tout seul, il coûte 121 simulations de 8 760 pas. */
      presizingReady
        ? 'Lancez le prédimensionnement'
        : !hasSite
          ? 'Chargez une série météo pour ce site'
          : 'Saisissez les besoins électriques',
      !hasSite ? 'site' : 'besoins',
    ),
    sizing: gate(
      presizingReady && hasAllRefs,
      !presizingReady
        ? 'Lancez d’abord le prédimensionnement'
        : 'Choisissez module, batterie et onduleur',
      !presizingReady ? 'hypotheses' : 'materiel',
    ),
    costing: gate(hasPrices, 'Renseignez les prix de revient', 'chiffrage'),
  };
}
