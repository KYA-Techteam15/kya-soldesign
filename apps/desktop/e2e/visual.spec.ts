import { expect, test, type Page } from '@playwright/test';

type Locale = 'fr' | 'en';
type Viewport = { readonly label: '1440' | '1024'; readonly width: number; readonly height: number };

const viewports: readonly Viewport[] = [
  { label: '1440', width: 1440, height: 1000 },
  { label: '1024', width: 1024, height: 768 },
];
const locales: readonly Locale[] = ['fr', 'en'];

async function setLocale(page: Page, locale: Locale) {
  if (locale === 'en') await page.getByRole('button', { name: 'Switch to English' }).click();
}

async function openDraft(page: Page, locale: Locale) {
  await page.goto('/accueil');
  await setLocale(page, locale);
  await page.getByRole('button', { name: locale === 'fr' ? 'Créer l’étude' : 'Create study' }).click();
}

for (const viewport of viewports) {
  for (const locale of locales) {
    test(`@visual top-level routes ${locale.toUpperCase()} at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const routes = [
        ['/accueil', 'home'], ['/accueil/projets', 'projects'], ['/catalogue', 'catalog'], ['/reglages', 'settings'],
      ] as const;
      for (const [route, name] of routes) {
        await page.goto(route);
        await setLocale(page, locale);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        if (route === '/catalogue') await expect(page.locator('.catalog-card').first()).toBeVisible();
        await expect(page).toHaveScreenshot(`${name}-${locale}-${viewport.label}.png`, { fullPage: route !== '/catalogue', animations: 'disabled', timeout: 15_000 });
      }
    });

    test(`@visual workshop ${locale.toUpperCase()} at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openDraft(page, locale);
      const surfaces = [
        [locale === 'fr' ? /Bilan des consommations/ : /Consumption assessment/, 'needs'],
        [locale === 'fr' ? /^05 Dimensionnement$/ : /^05 Equipment sizing$/, 'equipment'],
        [locale === 'fr' ? /^08 Vue synoptique/ : /^08 System diagram/, 'dossier'],
      ] as const;
      for (const [step, name] of surfaces) {
        await page.getByRole('button', { name: step }).click();
        await expect(page.locator('.work-card')).toBeVisible();
        await expect(page).toHaveScreenshot(`${name}-${locale}-${viewport.label}.png`, { fullPage: true, animations: 'disabled' });
      }
    });

    test(`@visual palette and dialog ${locale.toUpperCase()} at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/accueil');
      await setLocale(page, locale);
      await page.getByRole('button', { name: locale === 'fr' ? /Rechercher une action/ : /Search an action/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page).toHaveScreenshot(`palette-${locale}-${viewport.label}.png`, { fullPage: true, animations: 'disabled' });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: locale === 'fr' ? 'Créer l’étude' : 'Create study' }).click();
      await page.getByRole('link', { name: locale === 'fr' ? /Retour aux projets/ : /Back to projects/ }).click();
      await page.getByRole('button', { name: locale === 'fr' ? 'Supprimer' : 'Remove' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page).toHaveScreenshot(`dialog-${locale}-${viewport.label}.png`, { fullPage: true, animations: 'disabled' });
    });
  }
}
