import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProjectSessionProvider } from './app/ProjectSessionProvider';
import { CatalogProvider } from './app/CatalogProvider';
import './styles/tokens.css';
import './styles/app.css';
import './styles/vivid.css';
import './styles/radiant.css';
import './styles/print.css';

// Next est servi par Vite puis par l'hôte desktop : les anciennes routes sont
// conservées telles quelles, sans fragment `#` dans les liens.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProjectSessionProvider>
        <CatalogProvider>
          <App />
        </CatalogProvider>
      </ProjectSessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
