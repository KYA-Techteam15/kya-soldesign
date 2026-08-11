import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SplashPage } from '../features/home/SplashPage.js';

const HomePage = lazy(() => import('../features/home/HomePage.js').then((module) => ({ default: module.HomePage })));
const ProjectsPage = lazy(() => import('../features/projects/ProjectsPage.js').then((module) => ({ default: module.ProjectsPage })));
const CatalogPage = lazy(() => import('../features/catalog/CatalogPage.js').then((module) => ({ default: module.CatalogPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage.js').then((module) => ({ default: module.SettingsPage })));
const WorkshopLayout = lazy(() => import('../features/workshop/WorkshopLayout.js').then((module) => ({ default: module.WorkshopLayout })));
const NotFoundPage = lazy(() => import('../features/not-found/NotFoundPage.js').then((module) => ({ default: module.NotFoundPage })));

export function AppRoutes() {
  return <Suspense fallback={<SplashPage />}><Routes>
    <Route path="/accueil" element={<HomePage />} />
    <Route path="/accueil/projets" element={<ProjectsPage />} />
    <Route path="/catalogue" element={<CatalogPage />} />
    <Route path="/reglages" element={<SettingsPage />} />
    <Route path="/projet/:projectId/atelier/:stepId" element={<WorkshopLayout />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>;
}
