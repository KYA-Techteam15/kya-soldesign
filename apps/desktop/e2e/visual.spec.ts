import { expect, test, type Page } from '@playwright/test';

type Locale = 'fr' | 'en';
type Viewport = { readonly label: '1440' | '1024'; readonly width: number; readonly height: number };

const viewports: readonly Viewport[] = [
  { label: '1440', width: 1440, height: 1000 },
  { label: '1024', width: 1024, height: 768 },
];
const locales: readonly Locale[] = ['fr', 'en'];

async function setLocale(page: Page, locale: Locale) {
  if (locale === 'en') await page.locator('.topbar button[title="Langue"]').click();
}

async function openDraft(page: Page, locale: Locale) {
  await page.goto('/accueil');
  await setLocale(page, locale);
  await page.getByRole('button', { name: locale === 'fr' ? 'Nouveau projet' : 'New project', exact: true }).click();
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
        if (route === '/catalogue') await expect(page.locator('.tbl tbody tr').first()).toBeVisible();
        await expect(page).toHaveScreenshot(`${name}-${locale}-${viewport.label}.png`, { fullPage: route !== '/catalogue', animations: 'disabled', timeout: 15_000 });
      }
    });

    test(`@visual workshop ${locale.toUpperCase()} at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openDraft(page, locale);
      const surfaces = [
        [2, 'needs'],
        [4, 'equipment'],
        [7, 'dossier'],
      ] as const;
      for (const [stepIndex, name] of surfaces) {
        await page.locator('.nav-item').nth(stepIndex).click();
        await expect(page.locator('.sheet')).toBeVisible();
        await expect(page).toHaveScreenshot(`${name}-${locale}-${viewport.label}.png`, { fullPage: true, animations: 'disabled', maxDiffPixels: 250 });
      }
    });

    test(`@visual palette and dialog ${locale.toUpperCase()} at ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/accueil');
      await setLocale(page, locale);
      await page.getByRole('button', { name: locale === 'fr' ? /Rechercher une action/ : /Search an action/ }).click();
      await expect(page.locator('.palette')).toBeVisible();
      await expect(page).toHaveScreenshot(`palette-${locale}-${viewport.label}.png`, { fullPage: true, animations: 'disabled' });
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: locale === 'fr' ? 'Nouveau projet' : 'New project', exact: true }).click();
      await page.locator('.wordmark').click();
      await page.getByRole('button', { name: locale === 'fr' ? 'Tous les projets →' : 'All projects →', exact: true }).click();
      await page.locator('.proj-row > .btn').click();
      await expect(page.locator('.modal')).toBeVisible();
      await expect(page).toHaveScreenshot(`dialog-${locale}-${viewport.label}.png`, { fullPage: true, animations: 'disabled' });
    });
  }
}
