import { expect, test } from '@playwright/test';

/**
 * Téléchargement par coordonnées, annuaire en panne.
 *
 * Nommer le site et lire son fuseau passent par deux services d'agrément,
 * hébergés ailleurs que PVGIS. Leur panne bloquait le téléchargement d'une
 * série d'irradiance pourtant accessible. Ces cas vérifient que la position
 * suffit désormais, et que le mode par nom — qui, lui, a réellement besoin de
 * l'annuaire pour trouver des coordonnées — reste franc sur son échec.
 */

/** Coupe les deux services de géocodage, en laissant PVGIS intact. */
async function breakGeocoding(page: import('@playwright/test').Page) {
  await page.route('**/external/bigdatacloud/**', (route) => route.abort('failed'));
  await page.route('**/external/open-meteo/**', (route) => route.abort('failed'));
}

async function openWeatherDialog(page: import('@playwright/test').Page) {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(1).click();
  await page.getByRole('button', { name: 'Télécharger les données d’irradiance d’une localité…' }).click();
  await expect(page.locator('.modal')).toContainText('Localiser le site');
}

test('les coordonnées suffisent quand l’annuaire ne répond pas', async ({ page }) => {
  await breakGeocoding(page);
  await openWeatherDialog(page);
  const dialog = page.locator('.modal');

  await dialog.getByRole('button', { name: 'Par coordonnées' }).click();
  await dialog.getByLabel('Latitude').fill('6,19');
  await dialog.getByLabel('Longitude').fill('1,19');
  await dialog.getByRole('button', { name: 'Rechercher' }).click();

  // L'échec est expliqué, pas présenté comme une impasse.
  await expect(dialog.getByRole('status')).toContainText('Les coordonnées suffisent pour interroger PVGIS');

  // Tant que le site n'est pas nommé, l'étape 2 reste fermée : on ne fabrique
  // pas un nom de dossier à la place de l'utilisateur.
  await expect(dialog.getByRole('button', { name: 'Télécharger', exact: true })).toBeDisabled();

  await dialog.getByLabel('Nom du site').fill('Lomé — site client');
  await expect(dialog.getByRole('button', { name: 'Télécharger', exact: true })).toBeEnabled();
});

test('un fuseau invalide ferme l’étape 2 plutôt que de produire une série mal alignée', async ({ page }) => {
  await breakGeocoding(page);
  await openWeatherDialog(page);
  const dialog = page.locator('.modal');

  await dialog.getByRole('button', { name: 'Par coordonnées' }).click();
  await dialog.getByLabel('Latitude').fill('6,19');
  await dialog.getByLabel('Longitude').fill('1,19');
  await dialog.getByRole('button', { name: 'Rechercher' }).click();
  await dialog.getByLabel('Nom du site').fill('Lomé');
  await expect(dialog.getByRole('button', { name: 'Télécharger', exact: true })).toBeEnabled();

  // Le fuseau aligne la charge sur l'irradiance : une valeur fantaisiste ne
  // doit pas passer, elle décalerait toute la simulation.
  await dialog.getByLabel('Fuseau horaire IANA').fill('Pas/Un/Fuseau');
  await expect(dialog.getByRole('button', { name: 'Télécharger', exact: true })).toBeDisabled();

  await dialog.getByLabel('Fuseau horaire IANA').fill('Africa/Lome');
  await expect(dialog.getByRole('button', { name: 'Télécharger', exact: true })).toBeEnabled();
});

test('la recherche par nom reste franche sur son échec', async ({ page }) => {
  await breakGeocoding(page);
  await openWeatherDialog(page);
  const dialog = page.locator('.modal');

  // Ici l'annuaire est indispensable : sans lui, aucune coordonnée. L'échec
  // doit rester une erreur, et non une invitation à saisir à la main.
  await dialog.getByRole('button', { name: 'Par pays et ville' }).click();
  await dialog.getByRole('textbox', { name: 'Ville' }).fill('Kara');
  await dialog.getByRole('button', { name: 'Rechercher' }).click();
  await expect(dialog.getByRole('alert')).toContainText('service de localisation');
  await expect(dialog.getByRole('button', { name: 'Télécharger', exact: true })).toBeDisabled();
});

test('télécharge réellement la série PVGIS malgré l’annuaire coupé', async ({ page }) => {
  test.slow(); // PVGIS met plusieurs secondes à composer une année type.
  await breakGeocoding(page);
  await openWeatherDialog(page);
  const dialog = page.locator('.modal');

  await dialog.getByRole('button', { name: 'Par coordonnées' }).click();
  await dialog.getByLabel('Latitude').fill('6,19');
  await dialog.getByLabel('Longitude').fill('1,19');
  await dialog.getByRole('button', { name: 'Rechercher' }).click();
  await dialog.getByLabel('Nom du site').fill('Lomé — site client');
  await dialog.getByRole('button', { name: 'Télécharger', exact: true }).click();

  // L'aperçu n'apparaît que si les 8 760 heures sont revenues et ont été
  // vérifiées : c'est la preuve que le téléchargement a bien abouti.
  await expect(dialog.locator('.weather-bars')).toBeVisible({ timeout: 90_000 });
  await expect(dialog.locator('.daily-note')).toContainText('Lomé — site client');
  await expect(dialog.locator('.daily-note')).toContainText('SHA-256');
  await expect(dialog.getByRole('button', { name: 'Enregistrer dans le dossier' })).toBeEnabled();
});
