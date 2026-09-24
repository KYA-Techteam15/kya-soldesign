import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProjectSessionProvider } from './app/ProjectSessionProvider';
import { CatalogProvider } from './app/CatalogProvider';
import { CalculationProvider } from './app/CalculationProvider';
import { openProjectService } from './app/persistence/bootstrap';
import { installGlobalErrorHandlers, logger } from './app/platform/logger';
import { installPlatform } from './app/platform/install';
import { ErrorBoundary } from './shell/ErrorBoundary';
import { translate } from './i18n';
import { useUi } from './store/ui';
import './styles/tokens.css';
import './styles/app.css';
import './styles/vivid.css';
import './styles/radiant.css';
import './styles/print.css';

const root = createRoot(document.getElementById('root')!);
const t = (key: string) => translate(key, useUi.getState().lang);

installGlobalErrorHandlers((message) => useUi.getState().notify({ kind: 'error', title: t('crash.unexpected'), detail: message }));

/* Les projets sont chargés depuis le dépôt durable avant le premier rendu : un
   écran ne lit jamais une liste vide qui se remplirait ensuite. */
async function start(): Promise<void> {
  await installPlatform();
  const service = await openProjectService();
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <ProjectSessionProvider service={service}>
            <CalculationProvider>
              <CatalogProvider>
                <App />
              </CatalogProvider>
            </CalculationProvider>
          </ProjectSessionProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  );
}

start().catch((error: unknown) => {
  logger.error('startup.failed', error);
  root.render(
    <div className="crash" role="alert">
      <div className="crash-card">
        <h1 className="page-title">{t('startup.failedTitle')}</h1>
        <p>{t('startup.failedLead')}</p>
        <pre className="crash-detail">{error instanceof Error ? error.message : String(error)}</pre>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{t('crash.reload')}</button>
      </div>
    </div>,
  );
});
