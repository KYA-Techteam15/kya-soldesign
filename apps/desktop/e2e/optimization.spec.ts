import { expect, test } from '@playwright/test';

const WEATHER_FILE = 'packages/catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json';

/** Optimisation sur « Mes références » (spec 011, FR-027 → FR-031). */
test('optimizes over my references, shows simulated proposals and keeps one on demand', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/catalogue');
  await page.locator('.fav-toggle').first().waitFor();
  for (const index of [0, 1]) await page.locator('.fav-toggle').nth(index).click();
  await expect(page.getByRole('button', { name: /Mes références \(2\/10\)/ })).toBeVisible();
  await page.getByRole('button', { name: /Batteries/ }).click();
  for (const index of [0, 1]) await page.locator('.fav-toggle').nth(index).click();

  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(1).click();
  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  await page.getByRole('button', { name: 'Depuis un fichier' }).click();
  await page.getByLabel('Nom du site').fill('Bombouaka');
  await page.getByLabel('Pays').selectOption('TG');
  await page.getByLabel('Fuseau horaire IANA').fill('Africa/Lome');
  await page.locator('.modal input[type="file"]').setInputFiles(WEATHER_FILE);
  await page.getByRole('button', { name: 'Enregistrer dans le dossier', exact: true }).last().click();
  await page.locator('.nav-item').nth(2).click();
  await page.getByRole('button', { name: /La liste des appareils/ }).click();
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).click();
  const row = page.locator('.t-appliances tbody tr').first();
  await row.getByLabel('Quantité').fill('10');
  await row.getByLabel('Puissance unitaire').fill('150');
  await row.getByLabel("Heures d'usage").fill('8');
  await page.keyboard.press('Tab');
  await page.locator('.nav-item').nth(3).click();
  await page.getByRole('button', { name: 'Lancer le prédimensionnement' }).click();
  await expect(page.getByRole('button', { name: 'Lancer le prédimensionnement' })).toBeEnabled({ timeout: 60_000 });

  await page.locator('.nav-item').nth(4).click();
  await page.getByRole('button', { name: 'Optimiser…' }).click();
  const dialog = page.locator('.modal');
  await expect(dialog).toContainText('2 × 2 ×');
  await dialog.getByRole('button', { name: 'Lancer la recherche' }).click();
  await expect(dialog.locator('.opt-table')).toBeVisible({ timeout: 60_000 });
  await expect(dialog).toContainText('simulées sur l’année');
  // Le SRI affiché est simulé : une valeur entre 0 et 1, jamais un tiret.
  await expect(dialog.locator('.opt-table tbody tr').first().locator('td').nth(4)).toHaveText(/^0,\d{3}$|^1,000$/u);
  await dialog.locator('.opt-table').getByRole('button', { name: 'Retenir' }).first().click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.runbar')).toContainText('Dimensionnement à jour', { timeout: 30_000 });
});
