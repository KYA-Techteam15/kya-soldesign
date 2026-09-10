import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CatalogProvider } from '../../src/app/CatalogProvider.js';
import { ProjectSessionProvider } from '../../src/app/ProjectSessionProvider.js';
import { CatalogRoute } from '../../src/routes/Catalog.js';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import type { CatalogQuery, CatalogQueryPort } from '../../src/app/contracts.js';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/vivid.css';
import '../../src/styles/radiant.css';
import '../../src/styles/print.css';

/**
 * Reprise après une lecture de catalogue en échec.
 *
 * La première lecture échoue, les suivantes réussissent : c'est le seul moyen
 * de voir l'état d'erreur puis la reprise sans dépendre d'une panne réelle. Le
 * harnais monte l'écran réellement livré — un banc monté sur un écran que
 * personne n'ouvre ne prouve rien de ce que l'utilisateur vit.
 */

const base = new CanonicalCatalog();
let attempts = 0;

const failingOnce: CatalogQueryPort = {
  list: async (query?: CatalogQuery) => {
    attempts += 1;
    if (attempts === 1) throw new Error('Injected catalog read failure');
    return base.list(query);
  },
  listLocalities: () => base.listLocalities(),
  listWeatherSources: (localityId?: string) => base.listWeatherSources(localityId),
  listWeatherFiles: () => base.listWeatherFiles(),
  listLoadProfiles: () => base.listLoadProfiles(),
  summary: () => base.summary(),
};

const root = document.getElementById('root');
if (!root) throw new Error('Harness root is missing');
createRoot(root).render(
  <BrowserRouter>
    <ProjectSessionProvider>
      <CatalogProvider catalog={failingOnce}>
        <CatalogRoute />
      </CatalogProvider>
    </ProjectSessionProvider>
  </BrowserRouter>,
);
