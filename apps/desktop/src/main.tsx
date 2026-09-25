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
import { browserStore, useLicense } from './app/licensing/licenseStore';
import { evaluateLicense, LicenseService } from './app/licensing/licenseService';
import { LICENSE_PUBLIC_KEY, SimulatedAdminApi } from './app/licensing/adminApi';
import { startUsage } from './app/feedback/usage';
import { SimulatedUsageApi } from './app/feedback/usageApi';
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
  await startLicensing();
  // Usage anonyme et avis : l'API de la plateforme est simulée tant qu'elle n'est pas publiée.
  startUsage(new SimulatedUsageApi(), () => useUi.getState().lang);
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

/**
 * Licence évaluée avant le premier rendu. Tant que la plateforme d'administration n'expose pas son
 * API, `SimulatedAdminApi` la joue et délivre au premier lancement une licence commerciale de
 * démonstration. L'état se recalcule chaque heure (jours restants) et se rafraîchit en ligne une
 * fois par jour.
 */
async function startLicensing(): Promise<void> {
  const license = useLicense.getState();
  try {
    await license.start(new LicenseService(new SimulatedAdminApi(), LICENSE_PUBLIC_KEY, browserStore(), () => Date.now(), 'KYA-COM-12M-DEMO'));
  } catch (error) {
    // Licence illisible (stockage, cryptographie indisponible) : lecture seule, jamais tout ouvert.
    logger.error('license.start.failed', error);
    useLicense.setState({ view: { ...evaluateLicense(null, Date.now(), null, null), status: 'invalid' } });
    return;
  }
  const refreshIfDue = () => {
    const verified = useLicense.getState().view?.lastVerifiedAt;
    if (navigator.onLine && (verified == null || Date.now() - Date.parse(verified) > 86_400_000)) void useLicense.getState().refresh();
  };
  refreshIfDue();
  window.setInterval(() => { void useLicense.getState().reevaluate(); refreshIfDue(); }, 3_600_000);
  window.addEventListener('online', refreshIfDue);
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
