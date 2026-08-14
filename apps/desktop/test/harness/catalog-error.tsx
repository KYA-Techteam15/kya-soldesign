import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ApplicationProvider, useApplication } from '../../src/app/ApplicationProvider.js';
import { CatalogPage } from '../../src/features/catalog/CatalogPage.js';
import { I18nProvider } from '../../src/shared/i18n/I18nProvider.js';
import { createTestServices } from '../support/createTestServices.js';
import '../../src/styles/tokens.css';
import '../../src/styles/base.css';
import '../../src/styles/utilities.css';

const base = createTestServices();
let attempts = 0;
const services = {
  ...base,
  catalog: {
    ...base.catalog,
    list: async (query?: Parameters<typeof base.catalog.list>[0]) => {
      attempts += 1;
      if (attempts === 1) throw new Error('Injected catalog read failure');
      return base.catalog.list(query);
    },
    listLocalities: () => base.catalog.listLocalities(),
    listWeatherSources: (localityId?: string) => base.catalog.listWeatherSources(localityId),
    listWeatherFiles: () => base.catalog.listWeatherFiles(),
    summary: () => base.catalog.summary(),
  },
};

function Harness() {
  const { locale } = useApplication();
  return <I18nProvider locale={locale}><CatalogPage /></I18nProvider>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Harness root is missing');
createRoot(root).render(<BrowserRouter><ApplicationProvider services={services}><Harness /></ApplicationProvider></BrowserRouter>);
