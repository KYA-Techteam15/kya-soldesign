/**
 * Géocodage — équivalent hors ligne de `LocationService` (geopy/Nominatim).
 *
 * Le logiciel interroge Nominatim dans les deux sens : coordonnées vers ville
 * (`get_address_from_coords`) et ville vers coordonnées (`get_coords_from_address`).
 * Le prototype travaille hors ligne (critère D1), donc on répond depuis les
 * localités déjà en base et, à défaut, par le centroïde du pays. Les formes
 * de retour et les cas d'échec sont ceux du service Python : quatre décimales
 * à l'aller, pays plus ville au retour, `null` quand rien n'est trouvé.
 */

import { countries, localities, weatherSources } from '../data/reference';
import type { LocalityRef, WeatherSourceRef } from './types';

export interface GeoHit {
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  /** Vrai quand la position vient d'une localité déjà en base. */
  known: boolean;
  /** Distance au repère le plus proche, en kilomètres. */
  km?: number;
}

/** Repères par pays, pour répondre au-delà des quatorze localités en base. */
const CENTROIDS: Record<string, [number, number, string]> = {
  TG: [6.1319, 1.2228, 'Lomé'],
  BJ: [6.3654, 2.4183, 'Cotonou'],
  BF: [12.3682, -1.5271, 'Ouagadougou'],
  CI: [5.3599, -4.0083, 'Abidjan'],
  GH: [5.6037, -0.187, 'Accra'],
  ML: [12.6392, -8.0029, 'Bamako'],
  NE: [13.5127, 2.1126, 'Niamey'],
  NG: [9.0574, 7.4951, 'Abuja'],
  SN: [14.6928, -17.4467, 'Dakar'],
  CM: [3.848, 11.5021, 'Yaoundé'],
  DZ: [36.7729, 3.0588, 'Alger'],
  MA: [33.5731, -7.5898, 'Casablanca'],
  AO: [-8.8273, 13.244, 'Luanda'],
  ZA: [-25.7459, 28.1879, 'Prétoria'],
  FR: [48.8566, 2.3522, 'Paris'],
  DE: [52.5174, 13.3951, 'Berlin'],
};

const round4 = (v: number): number => Math.round(v * 1e4) / 1e4;

/** Distance approchée en kilomètres, suffisante pour classer des candidats. */
const distanceKm = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const dLat = (aLat - bLat) * 111;
  const dLon = (aLon - bLon) * 111 * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLon * dLon);
};

/**
 * Coordonnées vers lieu.
 *
 * Les localités en base et les repères de pays sont mis en concurrence dans
 * un même classement : les comparer séparément faisait gagner une capitale
 * lointaine sur une ville connue bien plus proche — un point du nord Togo
 * ressortait au Bénin parce que Cotonou battait Lomé de quelques kilomètres,
 * alors que Bombouaka était deux fois plus près.
 *
 * Hors réseau, le nom exact d'un point quelconque est hors de portée : on rend
 * le pays, qui est sûr, et le repère le plus proche, que l'appelant présente
 * comme un point de départ à corriger.
 */
export function placeFromCoords(latitude: number, longitude: number): GeoHit | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  const candidates: { name: string; code: string; lat: number; lon: number }[] = [
    ...localities.map((l) => ({
      name: l.name,
      code: l.country_code,
      lat: l.latitude,
      lon: l.longitude,
    })),
    ...Object.entries(CENTROIDS).map(([code, [lat, lon, name]]) => ({ name, code, lat, lon })),
  ];

  let best: { name: string; code: string } | null = null;
  let bestKm = Infinity;
  for (const c of candidates) {
    const km = distanceKm(latitude, longitude, c.lat, c.lon);
    if (km < bestKm) {
      bestKm = km;
      best = { name: c.name, code: c.code };
    }
  }
  // Au-delà de 900 km de tout repère, mieux vaut avouer l'ignorance que
  // proposer un pays qui n'a rien à voir avec le point saisi.
  if (!best || bestKm > 900) return null;

  return {
    name: best.name,
    countryCode: best.code,
    latitude: round4(latitude),
    longitude: round4(longitude),
    known: bestKm <= 25,
    km: Math.round(bestKm),
  };
}

/** Lieu vers coordonnées, à la manière de `get_coords_from_address`. */
export function coordsFromPlace(countryCode: string, town: string): GeoHit | null {
  const needle = town.trim().toLowerCase();
  if (!countryCode || !needle) return null;

  const known = localities.find(
    (l) => l.country_code === countryCode && l.name.toLowerCase() === needle,
  );
  if (known) {
    return {
      name: known.name,
      countryCode,
      latitude: round4(known.latitude),
      longitude: round4(known.longitude),
      known: true,
    };
  }

  const near = localities.find(
    (l) => l.country_code === countryCode && l.name.toLowerCase().includes(needle),
  );
  if (near) {
    return {
      name: near.name,
      countryCode,
      latitude: round4(near.latitude),
      longitude: round4(near.longitude),
      known: true,
    };
  }

  const centroid = CENTROIDS[countryCode];
  if (!centroid) return null;
  // Ville inconnue dans un pays connu : on décale légèrement le centroïde pour
  // ne pas rendre deux fois la même position à deux villes différentes.
  const jitter = ([...needle].reduce((a, c) => a + c.charCodeAt(0), 0) % 40) / 100 - 0.2;
  return {
    name: town.trim(),
    countryCode,
    latitude: round4(centroid[0] + jitter),
    longitude: round4(centroid[1] - jitter),
    known: false,
  };
}

/** Pays qui savent répondre, dans la langue courante. */
export function geocodableCountries(lang: 'fr' | 'en'): { code: string; name: string }[] {
  const codes = new Set([...Object.keys(CENTROIDS), ...localities.map((l) => l.country_code)]);
  return [...codes]
    .map((code) => {
      const c = countries.find((x) => x.alpha2 === code);
      return { code, name: c ? (lang === 'fr' ? c.nom_fr_fr : c.nom_en_gb) : code };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/**
 * Localité en base correspondant à un lieu visé, nom ET position à l'appui.
 *
 * Même règle que `existingSeriesFor`, sans exiger qu'une série y soit
 * attachée : sert à dire si l'enregistrement créera une localité ou en
 * complétera une.
 */
export function localityFor(
  countryCode: string,
  name: string,
  latitude?: number,
  longitude?: number,
): LocalityRef | null {
  const needle = name.trim().toLowerCase();
  const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);
  const byName = localities.find(
    (l) => l.country_code === countryCode && l.name.toLowerCase() === needle,
  );
  if (byName) {
    if (!hasPoint) return byName;
    if (distanceKm(latitude as number, longitude as number, byName.latitude, byName.longitude) <= 50) {
      return byName;
    }
  }
  if (!hasPoint) return null;
  const near = localities
    .map((l) => ({ l, km: distanceKm(latitude as number, longitude as number, l.latitude, l.longitude) }))
    .filter((x) => x.km <= 15)
    .sort((a, b) => a.km - b.km);
  return near[0]?.l ?? null;
}

/**
 * Série déjà en base pour un lieu donné.
 *
 * `find_or_create_locality` rapproche par nom et code pays ; deux relevés du
 * même site rendus sous des orthographes différentes créeraient deux entrées.
 * On ajoute donc la proximité géographique : sous 15 km, c'est le même site
 * de production, quel que soit le nom saisi.
 *
 * Sert à savoir si un téléchargement AJOUTE une série ou en REMPLACE une.
 * La question porte sur le lieu visé, jamais sur celui déjà ouvert dans le
 * dossier : choisir Alger puis télécharger Kara n'écrase rien.
 */
export function existingSeriesFor(
  countryCode: string,
  name: string,
  latitude?: number,
  longitude?: number,
): { locality: LocalityRef; source: WeatherSourceRef } | null {
  const needle = name.trim().toLowerCase();
  const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);
  const withSource = (l: LocalityRef) => {
    const source = weatherSources.find((w) => w.locality_id === l.id);
    return source ? { locality: l, source } : null;
  };

  const byName = localities.find(
    (l) => l.country_code === countryCode && l.name.toLowerCase() === needle,
  );
  if (byName) {
    /* Le nom seul ne suffit pas quand un point est connu : hors réseau,
       `placeFromCoords` propose le repère le plus proche comme point de
       départ, si bien qu'un site à 200 km d'Alger s'appelait encore
       « Alger » et déclenchait un faux remplacement. La position tranche. */
    const sameSite =
      !hasPoint ||
      distanceKm(latitude as number, longitude as number, byName.latitude, byName.longitude) <= 50;
    if (sameSite) {
      const found = withSource(byName);
      if (found) return found;
    }
  }

  if (!hasPoint) return null;
  const near = localities
    .map((l) => ({ l, km: distanceKm(latitude as number, longitude as number, l.latitude, l.longitude) }))
    .filter((x) => x.km <= 15)
    .sort((a, b) => a.km - b.km);
  for (const { l } of near) {
    const found = withSource(l);
    if (found) return found;
  }
  return null;
}
