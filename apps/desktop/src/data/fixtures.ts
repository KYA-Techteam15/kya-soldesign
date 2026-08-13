/**
 * Projets de démonstration.
 *
 * Le projet de référence est le centre de santé de Bombouaka décrit dans
 * `BRIEF_DESIGN_KYA-SOLDESIGN.md` : 14 appareils, matériel réellement présent en base.
 * Les deux autres servent la liste de projets et les états de la page d'accueil.
 */

import type { Project } from '../domain/types';
import {
  batteryByCode,
  inverterByCode,
  localityByName,
  moduleByCode,
} from './reference';

const uid = (p: string, i: number) => `${p}-${i}`;

const classic = [
  ['Éclairage LED intérieur', 24, 12, 1.0, 6],
  ['Éclairage extérieur de sécurité', 6, 20, 1.0, 12],
  ['Ordinateur portable', 3, 65, 0.9, 8],
  ['Imprimante', 1, 350, 0.9, 1],
  ['Routeur / VSAT', 1, 45, 0.9, 24],
  ['Téléviseur salle d’attente', 1, 90, 0.9, 8],
  ['Concentrateur d’oxygène', 1, 350, 0.9, 6],
  ['Stérilisateur autoclave', 1, 1500, 0.95, 1.5],
  ['Microscope + centrifugeuse labo', 1, 400, 0.9, 3],
  ['Chargeurs divers', 6, 10, 0.85, 4],
] as const;

const inductive = [
  ['Réfrigérateur à vaccins', 2, 120, 0.85, 3.0, 12],
  ['Congélateur', 1, 200, 0.85, 3.0, 8],
  ['Ventilateur de plafond', 8, 60, 0.88, 2.5, 10],
  ['Pompe à eau de surface', 1, 750, 0.8, 3.5, 2],
] as const;

const hourlyShape = [
  0.4, 0.4, 0.4, 0.4, 0.4, 0.7, 1.0, 1.3, 1.7, 2.0, 2.1, 1.9, 1.5, 1.2, 1.3, 1.3,
  1.1, 0.95, 1.25, 1.45, 1.35, 0.95, 0.65, 0.55,
];

const bombouaka = localityByName('Bombouaka');

export const referenceProject = (): Project => ({
  id: 'p-2026-041',
  name: 'Électrification centre de santé',
  systemType: 'standalone_all_in_one',
  createdAt: '2026-03-12T09:00:00.000Z',
  updatedAt: '2026-03-12T16:40:00.000Z',
  currency: 'XOF',

  details: {
    clientName: 'District Sanitaire de Bombouaka',
    clientAddress: 'Bombouaka, Région des Savanes, Togo',
    clientTel: '+228 90 12 34 56',
    clientEmail: 'ds.bombouaka@sante.tg',
    followerName: 'K. Amégan',
    applicationType: 'commercial',
    projectDate: '2026-03-12',
    projectNumber: '2026-041',
    projectLocation: 'Bombouaka, Togo',
    projectImage: '',
  },

  site: {
    country: 'Togo',
    countryCode: 'TG',
    localityId: bombouaka?.id ?? null,
    region: 'Bombouaka',
    latitude: bombouaka?.latitude ?? 10.703,
    longitude: bombouaka?.longitude ?? 0.2099,
    tilt: 11,
    azimuth: 180,
    irradiation: 5.51,
    monthlyIrradiation: [
      5.9, 6.2, 6.1, 5.9, 5.6, 5.2, 4.8, 4.6, 4.9, 5.4, 5.8, 5.7,
    ],
    weatherSourceId: null,
    irradiationBasis: { tilt: 11, azimuth: 180 },
    downloadedSource: null,
  },

  load: {
    granularity: 'annual',
    activeProfileId: 'prof-1',
    irMin: 10,
    profiles: [
      {
        id: 'prof-1',
        name: 'Profil annuel',
        color: '#F99D32',
        source: 'equipments',
        classic: classic.map(([name, qty, unitPower, yld, opHours], i) => ({
          id: uid('c', i),
          name,
          qty,
          unitPower,
          yield: yld,
          opHours,
        })),
        inductive: inductive.map(
          ([name, qty, unitPower, yld, startupCoef, opHours], i) => ({
            id: uid('i', i),
            name,
            qty,
            unitPower,
            yield: yld,
            startupCoef,
            opHours,
          }),
        ),
        hourly: hourlyShape.map((v, hour) => ({
          hour,
          realPower: v,
          peakPower: round1(v * 1.35),
        })),
        meter: {
          monthlyEnergy: 790,
          meterAmperage: 30,
          networkType: 'single_phase',
          morningPeakStart: '07:00',
          morningPeakEnd: '11:00',
          eveningPeakStart: '18:00',
          eveningPeakEnd: '21:00',
          peakImportance: 0.65,
          targetQualityFactor: 0.52,
        },
      },
    ],
  },

  assumptions: {
    lpspMax: 5,
    lolpMax: 5,
    systemPr: 70,
    inverterYield: 95,
    batteryYield: 90,
    batteryVoltage: 48,
    batteryDod: 80,

    pvSpecificCost: 131868,
    pvMargin: 15,
    batterySpecificCost: 120000,
    batteryMargin: 20,
    inverterSpecificCost: 96690,
    inverterMargin: 25,

    projectLifetime: 25,
    pvLifetime: 25,
    // Lithium : 12 ans, et non les 5 ans du défaut plomb de l'app actuelle
    batteryLifetime: 12,
    inverterLifetime: 10,

    pvMaintenance: 1,
    batteryMaintenance: 1,
    inverterMaintenance: 2,
    actualizationRate: 8,

    lcoeGrid: 120,
    emissionFactor: 0.5,
    autoConsumptionRate: 100,
    // `ci_dg` par défaut dans `LifecycleParams`
    dieselSpecificCost: 300000,

  },

  selection: {
    moduleId: moduleByCode('Module 72M HC Mono P-Type 540Wc 24V-jo')?.id ?? null,
    batteryId: batteryByCode('Batterie 48V 100Ah LI-ACE')?.id ?? null,
    inverterId: inverterByCode('Onduleur EA3KHD')?.id ?? null,
  },

  cables: [
    { segment: 'pv_inverter', length: 25, material: 'copper', installation: 'not_buried' },
    { segment: 'inverter_battery', length: 3, material: 'copper', installation: 'not_buried' },
    { segment: 'inverter_load', length: 15, material: 'copper', installation: 'not_buried' },
  ],

  // Calibres laissés à la recommandation : `null` = on suit le conseil.
  protections: [
    { segment: 'pv_inverter', caliberA: null },
    { segment: 'inverter_battery', caliberA: null },
    { segment: 'inverter_load', caliberA: null },
  ],

  costing: {
    useGlobalCost: true,
    moduleUnitPrice: 60000,
    moduleMargin: 30,
    batteryUnitPrice: 600000,
    batteryMargin: 30,
    inverterUnitPrice: 480000,
    inverterMargin: 30,

    definedCostForAccessories: false,
    cablingPrice: 10,
    cablingMargin: 30,
    electricalBoxPrice: 10,
    electricalBoxMargin: 30,
    supportsPrice: 10,
    supportsMargin: 30,
    transportPrice: 10,
    transportMargin: 30,
    installationPrice: 10,
    installationMargin: 30,

    tvaPercent: 18,
    reductionPercent: 0,
    downPaymentPercent: 30,
    deliveryTime: 30,
    offerValidity: 30,
    productWarranty: 24,

    additional: [],
  },
});

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Un projet neuf, vide, tel que créé depuis l'accueil. */
export const blankProject = (id: string, systemType: Project['systemType']): Project => {
  const base = referenceProject();
  const today = new Date().toISOString();
  return {
    ...base,
    id,
    name: 'Nouveau projet',
    systemType,
    createdAt: today,
    updatedAt: today,
    details: {
      ...base.details,
      clientName: '',
      clientAddress: '',
      clientTel: '',
      clientEmail: '',
      projectNumber: '',
      projectLocation: '',
      projectDate: today.slice(0, 10),
    },
    site: {
      ...base.site,
      country: '',
      countryCode: '',
      localityId: null,
      region: '',
      latitude: 0,
      longitude: 0,
      irradiation: 0,
      monthlyIrradiation: new Array(12).fill(0),
      irradiationBasis: null,
      downloadedSource: null,
    },
    load: {
      ...base.load,
      profiles: [
        {
          ...base.load.profiles[0],
          classic: [],
          inductive: [],
          hourly: new Array(24)
            .fill(0)
            .map((_, hour) => ({ hour, realPower: 0, peakPower: 0 })),
        },
      ],
    },
    selection: { moduleId: null, batteryId: null, inverterId: null },
  };
};

/** Deux autres dossiers, pour peupler la liste de projets. */
export const otherProjects = (): Project[] => {
  const a = referenceProject();
  return [
    {
      ...a,
      id: 'p-2026-038',
      name: 'Pompage solaire — périmètre maraîcher',
      createdAt: '2026-02-18T08:10:00.000Z',
      updatedAt: '2026-03-02T11:25:00.000Z',
      details: {
        ...a.details,
        clientName: 'Coopérative Agricole de Dapaong',
        projectNumber: '2026-038',
        projectLocation: 'Dapaong, Togo',
        applicationType: 'agricultural',
      },
    },
    {
      ...a,
      id: 'p-2026-035',
      name: 'Villa autonome — Baguida',
      createdAt: '2026-01-09T14:00:00.000Z',
      updatedAt: '2026-01-30T17:45:00.000Z',
      details: {
        ...a.details,
        clientName: 'M. Kodjo A.',
        projectNumber: '2026-035',
        projectLocation: 'Baguida, Togo',
        applicationType: 'residential',
      },
    },
  ];
};
