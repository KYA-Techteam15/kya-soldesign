import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ApplicationProvider, useApplication } from './app/ApplicationProvider.js';
import { CommandPalette } from './app/shell/CommandPalette.js';
import { StatusBar } from './app/shell/StatusBar.js';
import { TopBar } from './app/shell/TopBar.js';
import { AppRoutes } from './app/router.js';
import { I18nProvider } from './shared/i18n/index.js';

function AppFrame() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { locale, theme } = useApplication();
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dataset['theme'] = theme; }, [locale, theme]);
  useEffect(() => {
    const openPalette = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(true); } };
    window.addEventListener('keydown', openPalette);
    return () => window.removeEventListener('keydown', openPalette);
  }, []);
  return <div className="app-shell"><TopBar onOpenPalette={() => setPaletteOpen(true)} /><AppRoutes /><StatusBar /><CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} /></div>;
}

export function App() {
  return <BrowserRouter><ApplicationProvider><LocalizedApp /></ApplicationProvider></BrowserRouter>;
}

function LocalizedApp() {
  const { locale } = useApplication();
  return <I18nProvider locale={locale}><AppFrame /></I18nProvider>;
}
