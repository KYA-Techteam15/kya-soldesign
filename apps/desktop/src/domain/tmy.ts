/**
 * Série météo simulée — équivalent hors ligne de l'appel PVGIS.
 *
 * Le logiciel télécharge une année type, puis `find_optimal_orientation`
 * balaie les inclinaisons de 0 à 90° par pas de 5 pour retenir celle qui
 * maximise le cumul annuel. On reproduit la forme du résultat — douze
 * moyennes mensuelles et l'orientation optimale — sans réseau.
 */

export interface TmyPreview {
  monthly: number[]; // 12 valeurs, kWh/m²/j en plan des modules
  average: number;
  optimalTilt: number;
  optimalAzimuth: number;
  hourlySteps: number;
}

/** Formule empirique du logiciel : β = 0,76 φ + 3,1. */
export const empiricalTilt = (latitude: number): number =>
  Math.round((0.76 * Math.abs(latitude) + 3.1) * 10) / 10;

/**
 * Azimut optimal — `find_optimal_orientation` ne le balaie pas : il le pose.
 * Plein sud au nord de l'équateur, plein nord au sud.
 */
export const optimalAzimuthFor = (latitude: number): number => (latitude > 0 ? 180 : 0);

/**
 * Inclinaison optimale telle que le logiciel la retient : la formule
 * empirique, ramenée au pas de 5° du balayage `range(0, 91, 5)`.
 */
export const optimalTiltFor = (latitude: number): number =>
  Math.min(60, Math.max(5, Math.round(empiricalTilt(latitude) / 5) * 5));

export function fetchTmy(latitude: number, longitude: number): TmyPreview {
  const absLat = Math.abs(latitude);
  // Plus on s'éloigne de l'équateur, plus la moyenne baisse et plus l'écart
  // entre saisons se creuse.
  const base = 6.2 - absLat * 0.035;
  const swing = 0.25 + absLat * 0.055;
  const north = latitude >= 0;

  const monthly = Array.from({ length: 12 }, (_, m) => {
    const phase = ((m - 5.5) / 12) * 2 * Math.PI;
    const season = north ? -Math.cos(phase + Math.PI) : Math.cos(phase + Math.PI);
    // Décalage stable par longitude : deux sites de même latitude ne rendent
    // pas exactement la même série.
    const local = (Math.sin((longitude + m * 17) * 0.7) * 0.12);
    return Math.max(0.4, Math.round((base + season * swing * 0.5 + local) * 10) / 10);
  });

  const average = monthly.reduce((a, b) => a + b, 0) / 12;
  const optimalTilt = optimalTiltFor(latitude);

  return {
    monthly,
    average: Math.round(average * 100) / 100,
    optimalTilt,
    optimalAzimuth: optimalAzimuthFor(latitude),
    hourlySteps: 8760,
  };
}

/** Longueur des mois, pour pondérer une moyenne annuelle. */
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Profil journalier moyen d'un mois, en W/m² dans le plan des modules.
 *
 * `get_hourly_mean_irradiance` groupe l'année type par heure du jour et
 * moyenne. Douze barres mensuelles disent combien de soleil arrive ; elles
 * ne disent pas quand. C'est cette courbe qui rend l'orientation lisible :
 * incliner vers l'ouest déplace la crête vers le soir.
 */
export function hourlyMeanIrradiance(
  latitude: number,
  month: number,
  tilt: number,
  azimuth: number,
  monthlyKwh: number,
): number[] {
  const north = latitude >= 0;
  // Déclinaison au 15 du mois, puis durée du jour par la formule horaire.
  const decl = 23.45 * Math.sin(((2 * Math.PI) / 365) * (284 + (month * 30.4 + 15)));
  const phi = (latitude * Math.PI) / 180;
  const d = (decl * Math.PI) / 180;
  const cosH = Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(d)));
  const halfDay = (Math.acos(cosH) * 12) / Math.PI; // heures de part et d'autre de midi

  // L'azimut du champ décale l'heure de crête : plein sud au nord de
  // l'équateur laisse la crête à midi solaire, l'est l'avance, l'ouest la retarde.
  const ref = north ? 180 : 0;
  const off = ((((azimuth - ref) % 360) + 540) % 360) - 180;
  const peak = 12 + off / 30;

  // Les pas PVGIS sont estampillés à l'heure pleine, et `groupby(index.hour)`
  // les regroupe tels quels : la case h porte l'heure h, pas l'intervalle.
  // La cloche s'annule au lever et au coucher — resserrée sur une fraction
  // du jour, elle concentrait tout le cumul et sortait une crête à 1 300 W/m²,
  // au-dessus du plafond physique du rayonnement en plan.
  const raw = Array.from({ length: 24 }, (_, h) => {
    const x = (h - peak) / Math.max(2, halfDay);
    if (Math.abs(x) >= 1) return 0;
    return Math.cos((x * Math.PI) / 2) ** 2;
  });

  // Une inclinaison éloignée de l'optimum perd du cumul sans changer la forme.
  const loss = Math.cos((Math.min(60, Math.abs(tilt - optimalTiltFor(latitude))) * Math.PI) / 180);
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  // Le cumul des 24 valeurs, en Wh/m², doit rendre la mensuelle en kWh/m²/j.
  const scale = (monthlyKwh * 1000 * Math.max(0.55, loss)) / sum;
  return raw.map((v) => Math.round(v * scale));
}

/**
 * Profil journalier moyen sur l'année entière.
 *
 * C'est ce que rend `get_hourly_mean_irradiance` : il groupe les 8 760 pas
 * par heure du jour, sans filtrer de mois. Le découpage mensuel de
 * `get_monthly_irradiance_profiles` est la vue détaillée, pas l'inverse.
 * C'est aussi ce profil annuel qui alimente le calcul du γ dans
 * `compute_single_profile_yen` — d'où son statut de référence.
 *
 * Chaque mois pèse son nombre de jours : une moyenne simple des douze
 * profils surévaluerait février.
 */
export function annualMeanIrradiance(
  latitude: number,
  tilt: number,
  azimuth: number,
  monthly: number[],
): number[] {
  const total = DAYS_IN_MONTH.reduce((a, b) => a + b, 0);
  const sum = Array.from<number>({ length: 24 }).fill(0);
  for (let m = 0; m < 12; m++) {
    const profile = hourlyMeanIrradiance(latitude, m, tilt, azimuth, monthly[m] ?? 0);
    for (let h = 0; h < 24; h++) sum[h] += profile[h] * DAYS_IN_MONTH[m];
  }
  return sum.map((v) => Math.round(v / total));
}

// ------------------------------------------------------- Lecture d'un fichier

export interface TmyFileRead {
  preview: TmyPreview;
  /** Ce qui a été reconnu, à montrer avant d'accepter. */
  kind: 'json' | 'csv';
  columns: string[];
  place?: { latitude: number; longitude: number };
}

/**
 * Lecture d'un export PVGIS déjà téléchargé.
 *
 * PVGIS rend une année type soit en JSON (`outputs.tmy_hourly`), soit en CSV
 * horaire. Sur un poste sans accès sortant — le cas courant en clientèle —
 * la seule voie est le fichier récupéré ailleurs. On lit ce qui est là,
 * on agrège comme `get_monthly_summary`, et on montre avant d'écrire.
 */
export function readTmyFile(name: string, text: string): TmyFileRead | { error: string } {
  const isJson = name.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{');
  try {
    return isJson ? readJson(text) : readCsv(text);
  } catch {
    return { error: 'Fichier illisible. Attendu : un export PVGIS horaire, JSON ou CSV.' };
  }
}

const GHI_KEYS = ['G(h)', 'Gb(n)', 'ghi', 'GHI', 'G_h'];

function summarise(
  hourly: number[],
  place: { latitude: number; longitude: number } | undefined,
): TmyPreview {
  // Douze mois de 730 pas : le découpage exact importe peu ici, la somme par
  // mois puis la division par le nombre de jours donne le kWh/m²/j attendu.
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let cursor = 0;
  const monthly = days.map((d) => {
    const span = Math.round((hourly.length * d) / 365);
    const slice = hourly.slice(cursor, cursor + span);
    cursor += span;
    const wh = slice.reduce((a, b) => a + b, 0);
    return Math.round((wh / 1000 / Math.max(1, d)) * 10) / 10;
  });
  const average = monthly.reduce((a, b) => a + b, 0) / 12;
  const lat = place?.latitude ?? 0;
  return {
    monthly,
    average: Math.round(average * 100) / 100,
    optimalTilt: optimalTiltFor(lat),
    optimalAzimuth: optimalAzimuthFor(lat),
    hourlySteps: hourly.length,
  };
}

function readJson(text: string): TmyFileRead | { error: string } {
  const doc = JSON.parse(text) as Record<string, unknown>;
  const outputs = (doc.outputs ?? {}) as Record<string, unknown>;
  const rows = (outputs.tmy_hourly ?? outputs.hourly ?? doc.hourly) as
    | Record<string, number>[]
    | undefined;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: 'JSON reçu, mais aucune série horaire dedans (outputs.tmy_hourly attendu).' };
  }
  const columns = Object.keys(rows[0]);
  const key = GHI_KEYS.find((k) => columns.includes(k));
  if (!key) {
    return { error: `Aucune colonne d'irradiance reconnue. Vu : ${columns.join(', ')}.` };
  }
  const meta = (doc.inputs ?? {}) as Record<string, unknown>;
  const loc = (meta.location ?? {}) as Record<string, number>;
  const place =
    typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
      ? { latitude: loc.latitude, longitude: loc.longitude }
      : undefined;
  const hourly = rows.map((r) => Number(r[key]) || 0);
  return { preview: summarise(hourly, place), kind: 'json', columns, place };
}

function readCsv(text: string): TmyFileRead | { error: string } {
  const lines = text.split(/\r?\n/);
  // L'en-tête PVGIS précède la table de quelques lignes de métadonnées.
  const head = lines.findIndex((l) => /time/i.test(l) && /,/.test(l));
  if (head < 0) return { error: 'CSV reçu, mais sans ligne d’en-tête reconnaissable.' };
  const columns = lines[head].split(',').map((c) => c.trim());
  const idx = columns.findIndex((c) => GHI_KEYS.includes(c));
  if (idx < 0) {
    return { error: `Aucune colonne d'irradiance reconnue. Vu : ${columns.join(', ')}.` };
  }
  const hourly: number[] = [];
  for (const line of lines.slice(head + 1)) {
    const cells = line.split(',');
    if (cells.length <= idx) continue;
    const v = Number.parseFloat(cells[idx]);
    if (Number.isFinite(v)) hourly.push(v);
  }
  if (hourly.length === 0) return { error: 'CSV reçu, mais aucune valeur horaire exploitable.' };
  // « Latitude (decimal degrees): 6.131 » en tête de fichier.
  const lat = /latitude[^:]*:\s*(-?\d+(?:\.\d+)?)/i.exec(text);
  const lon = /longitude[^:]*:\s*(-?\d+(?:\.\d+)?)/i.exec(text);
  const place =
    lat && lon ? { latitude: Number(lat[1]), longitude: Number(lon[1]) } : undefined;
  return { preview: summarise(hourly, place), kind: 'csv', columns, place };
}
