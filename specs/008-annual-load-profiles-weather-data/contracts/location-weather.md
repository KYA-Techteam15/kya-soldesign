# Contract — Localisation, acquisition météo et passerelle réseau

## Problème éliminé

Les chemins `/external/*` ne sont servis que par le proxy de `vite.config.ts`.
Ils n’existent pas dans un répertoire `dist` statique et ne sont pas disponibles
dans une application Tauri installée. Aucun client de production ne doit donc
construire directement ces chemins.

## Ports

```ts
interface GeocodingPort {
  byName(request: GeocodeByNameRequest): Promise<GeocodingResult>;
  byCoordinates(request: ReverseGeocodeRequest): Promise<GeocodingResult>;
}

interface WeatherAcquisitionPort {
  downloadTmy(request: WeatherDownloadRequest): Promise<CanonicalWeatherFile>;
  parseTmyJson(request: WeatherFileImportRequest): Promise<CanonicalWeatherFile>;
}

interface WeatherLibraryPort {
  list(): Promise<readonly WeatherLibraryRecordV2[]>;
  get(id: string): Promise<WeatherLibraryRecordV2 | null>;
}

interface SaveWeatherToProjectPort {
  execute(command: SaveWeatherToProjectCommand): Promise<void>;
}
```

## Adaptateurs

| Cible | Transport |
|---|---|
| tests | faux déterministe injecté |
| Vite dev/preview | passerelle same-origin `/external/*` |
| web production | `WEB_EXTERNAL_DATA_BASE_URL` vers une passerelle déployée |
| Tauri | client HTTP natif autorisé par la configuration Tauri |

Le choix est fait au bootstrap. `unconfigured` est un état valide et visible ;
un fallback implicite vers le serveur de développement est interdit.

## Résolution de localisation

1. correspondance locale exacte ou normalisée ;
2. fournisseur principal ;
3. fournisseur de secours approuvé ;
4. coordonnées manuelles ou import de fichier.

Chaque succès précise sa provenance. Les fournisseurs ne sont ni fusionnés ni
présentés sous un nom commun trompeur.

## Commande de confirmation

```ts
interface SaveWeatherToProjectCommand {
  readonly projectId: string;
  readonly expectedProjectUpdatedAtIso: string;
  readonly locality: LocalizedLocalityV1;
  readonly weather: WeatherLibraryRecordV2;
  readonly orientation: {
    readonly tiltDeg: number;
    readonly azimuthDeg: number;
  };
}
```

La commande vérifie la révision attendue, enregistre la bibliothèque et met à
jour le projet. Un conflit ou une erreur annule l’ensemble.

## Santé réseau

Les erreurs publiques distinguent au minimum : `unconfigured`, `timeout`,
`aborted`, `http`, `rate-limited`, `invalid-payload`, `not-found` et
`storage-failed`. Le texte utilisateur est localisé ; le code reste stable.

