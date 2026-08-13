/**
 * Bilingue dès la première vue, jamais ajouté après (critère D3).
 * Le français est la langue de conception : c'est la plus longue, donc la plus
 * contraignante pour les mises en page.
 */

import { useUi, type Lang } from '../store/ui';

type Dict = Record<string, { fr: string; en: string }>;

export const messages: Dict = {
  // Coque
  'app.name': { fr: 'KYA-SolDesign', en: 'KYA-SolDesign' },
  'app.search': { fr: 'Rechercher une action', en: 'Search an action' },
  'app.theme.dark': { fr: 'Mode sombre', en: 'Dark mode' },
  'app.theme.light': { fr: 'Mode clair', en: 'Light mode' },
  'app.offline': { fr: 'Hors ligne — base locale', en: 'Offline — local database' },
  'app.saved': { fr: 'Enregistré automatiquement', en: 'Auto-saved' },
  'app.recalculated': { fr: 'Recalculé', en: 'Recalculated' },
  'app.simulated': {
    fr: 'Calculs simulés — prototype de design, les valeurs ne sont pas exploitables',
    en: 'Simulated calculations — design prototype, values are not usable',
  },
  'app.back': { fr: 'Retour', en: 'Back' },

  // Démarrage et accueil
  'splash.tagline': {
    fr: 'Dimensionnement d’installations solaires autonomes',
    en: 'Off-grid solar system sizing',
  },
  'splash.loading': { fr: 'Chargement du référentiel…', en: 'Loading reference data…' },
  'home.welcome': { fr: 'Bienvenue', en: 'Welcome' },
  'home.subtitle': {
    fr: 'Choisissez un type de système pour démarrer une étude, ou reprenez un dossier.',
    en: 'Pick a system type to start a study, or resume a project.',
  },
  'home.newProject': { fr: 'Nouveau projet', en: 'New project' },
  'home.recent': { fr: 'Projets récents', en: 'Recent projects' },
  'home.allProjects': { fr: 'Tous les projets', en: 'All projects' },
  'home.systems': { fr: 'Types de système', en: 'System types' },
  'home.comingSoon': { fr: 'À venir', en: 'Coming soon' },
  'home.catalog': { fr: 'Catalogue matériel', en: 'Equipment catalog' },
  'home.settings': { fr: 'Réglages', en: 'Settings' },

  /* Types de système. La nomenclature suit le menu « Nouveau projet » du
     logiciel : deux systèmes autonomes, puis le couplage réseau, l'hybride
     PV/diesel, le lampadaire et le pompage. « Au fil du soleil » est repris
     tel quel — c'est ce qui dit que le pompage n'a pas de batterie. */
  'sys.standalone_all_in_one': {
    fr: 'Autonome · onduleur tout-en-un',
    en: 'Off-grid · all-in-one inverter',
  },
  'sys.standalone_inverter_controller': {
    fr: 'Autonome · onduleur et régulateur',
    en: 'Off-grid · inverter and controller',
  },
  'sys.grid_tied': { fr: 'Couplé au réseau', en: 'Grid-connected' },
  'sys.pv_diesel': { fr: 'Hybride PV et groupe électrogène', en: 'Hybrid PV and genset' },
  'sys.solar_street_light': { fr: 'Lampadaire solaire', en: 'Solar street light' },
  'sys.solar_water_pumping': {
    fr: 'Pompage au fil du soleil',
    en: 'Direct-coupled solar pumping',
  },

  /* Ce que chaque architecture a de propre, en une ligne. Le schéma le montre,
     la phrase le nomme : sans elle, deux systèmes autonomes se distinguent
     seulement par un titre et trois lettres. */
  'sysd.standalone_all_in_one': {
    fr: 'Un seul appareil gère le champ, le parc et la sortie alternative.',
    en: 'A single unit handles the array, the bank and the AC output.',
  },
  'sysd.standalone_inverter_controller': {
    fr: 'Régulateur et onduleur séparés : le parc se choisit indépendamment.',
    en: 'Separate controller and inverter: the bank is sized on its own.',
  },
  'sysd.grid_tied': {
    fr: 'Sans stockage : le réseau absorbe le surplus et couvre les manques.',
    en: 'No storage: the grid takes the surplus and covers the shortfall.',
  },
  'sysd.pv_diesel': {
    fr: 'Le groupe prend le relais quand le solaire et le parc ne suffisent plus.',
    en: 'The genset takes over when solar and storage fall short.',
  },
  'sysd.solar_street_light': {
    fr: 'Point lumineux autonome : panneau, batterie et luminaire sur un mât.',
    en: 'Self-contained pole: panel, battery and luminaire on one mast.',
  },
  'sysd.solar_water_pumping': {
    fr: 'Sans batterie : la pompe suit l’ensoleillement, l’eau fait réserve.',
    en: 'No battery: the pump follows the sun, the tank stores the energy.',
  },

  // Atelier
  'ws.workshop': { fr: 'Atelier', en: 'Workshop' },
  'ws.dossier': { fr: 'Dossier client', en: 'Client file' },
  'ws.section.projet': { fr: 'Identification du projet', en: 'Project identification' },
  'ws.section.site': { fr: 'Choix du site', en: 'Site selection' },
  'ws.section.besoins': { fr: 'Bilan des consommations', en: 'Consumption assessment' },
  'ws.section.hypotheses': { fr: 'Prédimensionnement', en: 'Pre-sizing' },
  'ws.section.materiel': { fr: 'Dimensionnement', en: 'Equipment sizing' },
  'ws.section.protections': {
    fr: 'Choix des éléments de protection et de la câblerie',
    en: 'Protection devices and wiring selection',
  },
  'ws.section.chiffrage': { fr: 'Évaluation financière', en: 'Financial assessment' },
  'ws.section.dossier': { fr: 'Vue synoptique et rapports', en: 'System diagram & reports' },
  'ws.folder': { fr: 'Dossier', en: 'File' },
  'ws.toComplete': { fr: 'À compléter', en: 'To complete' },
  'ws.complete': { fr: 'Section complète', en: 'Section complete' },
  'unit.appliances': { fr: 'app.', en: 'items' },
  'unit.refs': { fr: 'réf.', en: 'refs' },
  'unit.vat': { fr: 'TVA', en: 'VAT' },

  // Verdict
  'v.viability': { fr: 'Viabilité · SVI', en: 'Viability · SVI' },
  'v.viable': { fr: 'Viable', en: 'Viable' },
  'v.notViable': { fr: 'Non viable', en: 'Not viable' },
  'v.threshold': { fr: 'seuil', en: 'threshold' },
  'v.reliability': { fr: 'Fiabilité', en: 'Reliability' },
  'v.system': { fr: 'Système préconisé', en: 'Recommended system' },
  'v.economy': { fr: 'Économie', en: 'Economics' },
  'v.impact': { fr: 'Impact', en: 'Impact' },
  'v.peakPower': { fr: 'Puissance crête', en: 'Peak power' },
  'v.storage': { fr: 'Stockage', en: 'Storage' },
  'v.inverter': { fr: 'Onduleur', en: 'Inverter' },
  'v.production': { fr: 'Production', en: 'Production' },
  'v.lcoe': { fr: 'LCOE actualisé', en: 'Discounted LCOE' },
  'v.wpPrice': { fr: 'Prix du Wc', en: 'Price per Wp' },
  'v.totalTtc': { fr: 'Total TTC', en: 'Total incl. VAT' },
  'v.co2': { fr: 'CO₂ évité', en: 'CO₂ avoided' },
  'v.toDecide': { fr: 'point à trancher', en: 'issue to settle' },
  'v.toDecidePlural': { fr: 'points à trancher', en: 'issues to settle' },
  // Provenance des valeurs : plancher théorique ou matériel réellement retenu
  'v.theoretical': { fr: 'théorique', en: 'theoretical' },
  'v.simulated': { fr: 'simulé', en: 'simulated' },
  'v.systemMinimum': { fr: 'Minimums à couvrir', en: 'Minimums to cover' },
  'v.systemChosen': { fr: 'Système retenu', en: 'Chosen system' },

  // Générique
  'g.open': { fr: 'Ouvrir', en: 'Open' },
  'g.delete': { fr: 'Supprimer', en: 'Delete' },
  'g.cancel': { fr: 'Annuler', en: 'Cancel' },
  'g.confirm': { fr: 'Confirmer', en: 'Confirm' },
  'g.search': { fr: 'Rechercher…', en: 'Search…' },
  'g.empty': { fr: 'Rien à afficher', en: 'Nothing to show' },
  'g.inProgress': { fr: 'En construction', en: 'Under construction' },
};

export const translate = (key: string, lang: Lang): string => {
  const entry = messages[key];
  if (!entry) return key;
  return entry[lang] ?? entry.fr;
};

/** Hook de traduction. `t('ws.section.site')`. */
export const useT = (): ((key: string) => string) => {
  const lang = useUi((s) => s.lang);
  return (key: string) => translate(key, lang);
};
