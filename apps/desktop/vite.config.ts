import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

const externalDataProxy = {
  '/external/open-meteo/geocoding': {
    target: 'https://geocoding-api.open-meteo.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/external\/open-meteo\/geocoding/u, '/v1/search'),
  },
  '/external/open-meteo/forecast': {
    target: 'https://api.open-meteo.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/external\/open-meteo\/forecast/u, '/v1/forecast'),
  },
  '/external/bigdatacloud/reverse-geocode': {
    target: 'https://api.bigdatacloud.net',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/external\/bigdatacloud\/reverse-geocode/u, '/data/reverse-geocode-client'),
  },
  '/external/pvgis/tmy': {
    target: 'https://re.jrc.ec.europa.eu',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/external\/pvgis\/tmy/u, '/api/v5_3/tmy'),
    configure: (proxy) => {
      proxy.on('proxyReq', (request) => {
        request.removeHeader('origin');
        request.removeHeader('referer');
        request.setHeader('accept', 'application/json');
        request.setHeader('user-agent', 'KYA-SolDesign/1.0');
      });
    },
  },
} satisfies Record<string, ProxyOptions>;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // Les fournisseurs réels n'autorisent pas les appels directs d'un navigateur.
  // La passerelle conserve des chemins fermés et de même origine ; elle n'est pas
  // un proxy générique et ne transforme aucune donnée d'ingénierie.
  server: { proxy: externalDataProxy },
  preview: { proxy: externalDataProxy },
});
