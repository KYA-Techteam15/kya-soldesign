import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const WEATHER_FILE = 'packages/catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json';

test('keeps downloaded weather locally and lists only localities backed by a file', async ({ page }) => {
  test.setTimeout(60_000);
  const document = JSON.parse(await readFile(WEATHER_FILE, 'utf8')) as {
    inputs: { location: { latitude: number; longitude: number; elevation: number } };
  };
  document.inputs.location.latitude = 5.55602;
  document.inputs.location.longitude = -0.1969;
  document.inputs.location.elevation = 27;

  await page.route('**/external/open-meteo/geocoding?**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ results: [{ name: 'Accra', country_code: 'GH', latitude: 5.55602, longitude: -0.1969, timezone: 'Africa/Accra' }] }),
  }));
  await page.route('**/external/pvgis/tmy?**', (route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify(document),
  }));

  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(1).click();
  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  await page.getByLabel('Pays').selectOption('GH');
  await page.getByRole('textbox', { name: 'Ville', exact: true }).fill('Accra');
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page.getByRole('button', { name: 'Télécharger', exact: true }).click();
  await expect(page.getByText(/^SHA-256 [0-9a-f]+…$/u)).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.goto('/accueil');
  await page.reload();
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(1).click();
  await page.locator('.pickfield').click();
  await expect(page.locator('.proj-row')).toHaveCount(2);
  await expect(page.locator('.proj-row').filter({ hasText: 'Accra' })).toBeVisible();
  await expect(page.locator('.proj-row').filter({ hasText: 'Bombouaka' })).toBeVisible();
  await expect(page.getByText('Alger', { exact: true })).toHaveCount(0);
  await expect(page.getByText('sans fichier', { exact: true })).toHaveCount(0);
  await page.locator('.proj-row').filter({ hasText: 'Accra' }).click();
  await expect(page.locator('.pickfield')).toContainText('Accra');
  await expect(page.getByRole('img', { name: 'Irradiation mensuelle' })).toBeVisible();
  await expect(page.getByText('Météo conservée localement', { exact: true })).toBeVisible();
});
