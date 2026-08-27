import { expect, test } from '@playwright/test';

test('exposes the categorized settings and commits a locale-aware manual rate', async ({ page }) => {
  await page.goto('/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();
  await expect(page.getByText('Société et rapports', { exact: true })).toBeVisible();
  await expect(page.getByText('Fiabilité et dimensionnement', { exact: true })).toBeVisible();
  await expect(page.getByText('Conditions commerciales', { exact: true })).toBeVisible();
  await expect(page.getByText('À propos et version', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réinitialiser la catégorie' })).toHaveCount(6);

  const rate = page.getByLabel('Taux actuel');
  await rate.fill('1,25');
  await rate.press('Tab');
  await expect(rate).toHaveValue('1.25');
  await expect(page.getByText(/Saisie manuelle/)).toBeVisible();
});

test('keeps recent projects reachable from the home action bar', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page.getByRole('button', { name: /Projets récents/ })).toBeVisible();
  await page.getByRole('button', { name: /Projets récents/ }).click();
  await expect(page).toHaveURL(/\/accueil\/projets$/);
});
