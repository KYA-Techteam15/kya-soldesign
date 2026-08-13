import { useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useUi } from './store/ui';
import { Splash } from './routes/Splash';
import { Home } from './routes/Home';
import { ProjectsRoute } from './routes/Projects';
import { CatalogRoute } from './routes/Catalog';
import { SettingsRoute } from './routes/Settings';
import { WorkshopLayout } from './routes/workshop/WorkshopLayout';
import { SectionProjet } from './routes/workshop/SectionProjet';
import { SectionSite } from './routes/workshop/SectionSite';
import { SectionBesoins } from './routes/workshop/SectionBesoins';
import { SectionHypotheses } from './routes/workshop/SectionHypotheses';
import { SectionMateriel } from './routes/workshop/SectionMateriel';
import { SectionProtections } from './routes/workshop/SectionProtections';
import { SectionChiffrage } from './routes/workshop/SectionChiffrage';
import { SectionDossier } from './routes/workshop/SectionDossier';
import { Toasts } from './shell/Toasts';
import { ConfirmDialog } from './shell/ConfirmDialog';
import { CommandPalette } from './shell/CommandPalette';

export function App() {
  const theme = useUi((s) => s.theme);
  const vibe = useUi((s) => s.vibe);
  const setVibe = useUi((s) => s.setVibe);

  const setTheme = useUi((s) => s.setTheme);

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

  return (
    <>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/accueil" element={<Home />} />
        <Route path="/accueil/projets" element={<ProjectsRoute />} />
        <Route path="/catalogue" element={<CatalogRoute />} />
        <Route path="/reglages" element={<SettingsRoute />} />

        <Route path="/projet/:id" element={<WorkshopLayout />}>
          <Route index element={<Navigate to="atelier/projet" replace />} />
          <Route path="atelier/projet" element={<SectionProjet />} />
          <Route path="atelier/site" element={<SectionSite />} />
          <Route path="atelier/besoins" element={<SectionBesoins />} />
          <Route path="atelier/hypotheses" element={<SectionHypotheses />} />
          <Route path="atelier/materiel" element={<SectionMateriel />} />
          <Route path="atelier/protections" element={<SectionProtections />} />
          <Route path="atelier/chiffrage" element={<SectionChiffrage />} />
          <Route path="atelier/dossier" element={<SectionDossier />} />
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
