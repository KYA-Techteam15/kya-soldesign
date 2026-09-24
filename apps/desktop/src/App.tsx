import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useUi } from './store/ui';
import { Splash } from './routes/Splash';
import { Home } from './routes/Home';
import { WorkshopLayout } from './routes/workshop/WorkshopLayout';
import { Toasts } from './shell/Toasts';
import { ConfirmDialog } from './shell/ConfirmDialog';
import { CommandPalette } from './shell/CommandPalette';
import { useProjects } from './store/project';
import { useOpenedProjectFiles } from './app/useOpenedProjectFiles';
import { readNavigationSession, writeNavigationSession, writeProjectResumeTarget } from './app/navigationSession';

/*
 * Les écrans sont chargés à la demande : le démarrage ne paie ni le catalogue
 * complet, ni les générateurs Word et Excel, ni les écrans de l'atelier qu'on
 * n'a pas encore ouverts.
 */
const ProjectsRoute = lazy(() => import('./routes/Projects').then((module) => ({ default: module.ProjectsRoute })));
const CatalogRoute = lazy(() => import('./routes/Catalog').then((module) => ({ default: module.CatalogRoute })));
const SettingsRoute = lazy(() => import('./routes/Settings').then((module) => ({ default: module.SettingsRoute })));
const SectionProjet = lazy(() => import('./routes/workshop/SectionProjet').then((module) => ({ default: module.SectionProjet })));
const SectionSite = lazy(() => import('./routes/workshop/SectionSite').then((module) => ({ default: module.SectionSite })));
const SectionBesoins = lazy(() => import('./routes/workshop/SectionBesoins').then((module) => ({ default: module.SectionBesoins })));
const SectionHypotheses = lazy(() => import('./routes/workshop/SectionHypotheses').then((module) => ({ default: module.SectionHypotheses })));
const SectionMateriel = lazy(() => import('./routes/workshop/SectionMateriel').then((module) => ({ default: module.SectionMateriel })));
const SectionProtections = lazy(() => import('./routes/workshop/SectionProtections').then((module) => ({ default: module.SectionProtections })));
const SectionChiffrage = lazy(() => import('./routes/workshop/SectionChiffrage').then((module) => ({ default: module.SectionChiffrage })));
const SectionDossier = lazy(() => import('./routes/workshop/SectionDossier').then((module) => ({ default: module.SectionDossier })));

function Screen({ children }: { readonly children: ReactNode }) {
  return <Suspense fallback={<div className="screen-loading" role="status" aria-busy="true" />}>{children}</Suspense>;
}

export function App() {
  const theme = useUi((s) => s.theme);
  const vibe = useUi((s) => s.vibe);
  const setVibe = useUi((s) => s.setVibe);

  const setTheme = useUi((s) => s.setTheme);
  const location = useLocation();
  const projects = useProjects((s) => s.projects);

  useEffect(() => {
    const match = location.pathname.match(/^\/projet\/([^/]+)\/atelier\/([^/]+)$/u);
    if (!match) return;
    const project = projects.find((candidate) => candidate.id === match[1]);
    if (!project) return;
    writeProjectResumeTarget(project.id, location.pathname);
    const session = readNavigationSession(projects);
    writeNavigationSession({
      ...session,
      currentProjectId: project.id,
      route: location.pathname,
      search: location.search,
      activeProfileId: project.load.activeProfileId,
      dossierView: location.pathname.endsWith('/dossier') ? new URLSearchParams(location.search).get('vue') : session.dossierView,
    });
  }, [location.pathname, location.search, projects]);

  useEffect(() => {
    // ?theme=dark force le thème — utilisé par le script de captures
    const q = new URLSearchParams(window.location.search);
    const forced = q.get('theme');
    if (forced === 'dark' || forced === 'light') setTheme(forced);
    const v = q.get('vibe');
    if (v === 'vivid' || v === 'sober' || v === 'radiant') setVibe(v);
  }, [setTheme, setVibe]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.vibe = vibe;
  }, [theme, vibe]);

  useOpenedProjectFiles();

  return (
    <>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/accueil" element={<Home />} />
        <Route path="/accueil/projets" element={<Screen><ProjectsRoute /></Screen>} />
        <Route path="/catalogue" element={<Screen><CatalogRoute /></Screen>} />
        <Route path="/reglages" element={<Screen><SettingsRoute /></Screen>} />

        <Route path="/projet/:id" element={<WorkshopLayout />}>
          <Route index element={<Navigate to="atelier/projet" replace />} />
          <Route path="atelier/projet" element={<Screen><SectionProjet /></Screen>} />
          <Route path="atelier/site" element={<Screen><SectionSite /></Screen>} />
          <Route path="atelier/besoins" element={<Screen><SectionBesoins /></Screen>} />
          <Route path="atelier/hypotheses" element={<Screen><SectionHypotheses /></Screen>} />
          <Route path="atelier/materiel" element={<Screen><SectionMateriel /></Screen>} />
          <Route path="atelier/protections" element={<Screen><SectionProtections /></Screen>} />
          <Route path="atelier/chiffrage" element={<Screen><SectionChiffrage /></Screen>} />
          <Route path="atelier/dossier" element={<Screen><SectionDossier /></Screen>} />
        </Route>

        {/* L'ancienne adresse du mode dossier reste valide : les liens déjà
            partagés retombent sur l'étape finale du fil. */}
        <Route path="/projet/:id/dossier/*" element={<DossierRedirect />} />

        <Route path="*" element={<Navigate to="/accueil" replace />} />
      </Routes>

      <Toasts />
      <ConfirmDialog />
      <CommandPalette />
    </>
  );
}

function DossierRedirect() {
  const { id } = useParams();
  return <Navigate to={`/projet/${id}/atelier/dossier`} replace />;
}
