import { expect, test } from '@playwright/test';

/** Sources de consommation (spec 011, FR-012 → FR-017) : chaque source garde ses données. */
test('routes imports to the right source, keeps every source, and composes the year from the inventory', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(2).click();

  // L'étape vide pose la question ; « Un relevé horaire d'une année » ouvre l'import.
  await expect(page.getByRole('heading', { name: 'De quoi disposez-vous ?' })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Un relevé horaire d’une année/ }).click();
  await (await chooser).setFiles('test-data/profils-de-charge/profil-annuel-8760.csv');
  await expect(page.getByRole('tab', { name: 'Année importée' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.annual-import')).toContainText('profil-annuel-8760.csv');
  await expect(page.getByRole('img', { name: /Carte de chaleur de l’année/ }).first()).toBeVisible();

  // Un fichier de 24 lignes va à la journée type, sans toucher à l'année importée.
  await page.getByRole('tab', { name: 'Journée type' }).click();
  await page.locator('input[type=file][accept*=".csv"]').first().setInputFiles('test-data/profils-de-charge/profil-journee-type-24.csv');
  await expect(page.getByRole('tab', { name: 'Journée type' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Puissance à 0 h')).toHaveValue('1,26');
  await page.getByRole('tab', { name: 'Année importée' }).click();
  await expect(page.locator('.annual-import')).toContainText('8 760 h');

  // Les appareils, puis la passerelle vers l'année composée, pré-remplie depuis l'inventaire.
  await page.getByRole('tab', { name: 'Appareils' }).click();
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).click();
  await page.getByRole('button', { name: /Composer l’année →/ }).click();
  const dialog = page.locator('.modal');
  await expect(dialog.getByRole('button', { name: 'Depuis l’inventaire' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Appliquer la composition' }).click();
  await expect(page.getByRole('tab', { name: 'Année composée' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.composed-year .year-strip')).toBeVisible();

  // Revenir aux appareils : la ligne est toujours là.
  await page.getByRole('tab', { name: 'Appareils' }).click();
  await expect(page.locator('.t-appliances tbody tr')).toHaveCount(1);
});
