import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translate } from '../i18n';
import { useUi } from '../store/ui';
import { diagnosticReport, logger } from '../app/platform/logger';
import { diagnosticContext } from '../app/platform/diagnostics';
import { useUsage } from '../app/feedback/usage';

interface State { readonly error: Error | null; readonly copied: boolean; readonly reported: boolean }

/**
 * Filet de sécurité : un plantage de rendu affiche un écran de reprise au lieu
 * d'une fenêtre blanche. Les projets sont déjà enregistrés par la session ;
 * recharger ne perd que la saisie du champ en cours.
 */
export class ErrorBoundary extends Component<{ readonly children: ReactNode }, State> {
  public override state: State = { error: null, copied: false, reported: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('render.crash', `${error.name}: ${error.message}\n${info.componentStack ?? ''}`);
  }

  private readonly copy = async () => {
    try { await navigator.clipboard.writeText(diagnosticReport(diagnosticContext())); this.setState({ copied: true }); } catch { this.setState({ copied: false }); }
  };

  /** Le plantage part tel quel vers la plateforme : l'écran de reprise n'a pas de boîte d'avis. */
  private readonly report = async () => {
    const error = this.state.error;
    if (error === null) return;
    const sent = await useUsage.getState().submit({ kind: 'problem', message: `${error.name}: ${error.message}`, contact: '', diagnostics: diagnosticReport(diagnosticContext()) });
    this.setState({ reported: sent });
  };

  public override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    const t = (key: string) => translate(key, useUi.getState().lang);
    return (
      <div className="crash" role="alert">
        <div className="crash-card">
          <h1 className="page-title">{t('crash.title')}</h1>
          <p>{t('crash.lead')}</p>
          <pre className="crash-detail">{this.state.error.message}</pre>
          <div className="rowline">
            <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/accueil')}>{t('crash.home')}</button>
            <button type="button" className="btn" onClick={() => window.location.reload()}>{t('crash.reload')}</button>
            <button type="button" className="btn" onClick={() => { void this.copy(); }}>{this.state.copied ? t('crash.copied') : t('crash.copy')}</button>
            <button type="button" className="btn" disabled={this.state.reported} onClick={() => { void this.report(); }}>{this.state.reported ? t('crash.reported') : t('support.report')}</button>
          </div>
        </div>
      </div>
    );
  }
}
