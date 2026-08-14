import { expect, test } from '@playwright/test';

test('creates and edits a canonical project through the preserved workshop', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page.getByText('Aucun projet')).toBeVisible();
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await expect(page).toHaveURL(/\/projet\/[0-9a-f-]{36}\/atelier\/projet$/);

  await page.getByLabel('Nom du projet').fill('Centre de santé de test');
  await page.getByLabel('Numéro de dossier').fill('TEST-001');
  await page.getByLabel('Nom du client').fill('District sanitaire de test');
  await page.getByLabel('Localisation du site').fill('Lomé, Togo');
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Centre de santé de test');

  await page.locator('.nav-item').nth(1).click();
  await expect(page.locator('.stephead .h-page')).toHaveText('Choix du site');
  await page.locator('.nav-item').nth(2).click();
  await expect(page.locator('.stephead .h-page')).toHaveText('Bilan des consommations');
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  await expect(page.getByLabel('Nom').first()).toHaveValue('');

  await page.locator('.nav-item').first().click();
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Centre de santé de test');
  await expect(page.getByLabel('Nom du client')).toHaveValue('District sanitaire de test');
});

test('keeps an invalid transient edit visible without silently coercing it', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(2).click();
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  const quantity = page.getByLabel('Quantité').first();
  await quantity.fill('1.5');
  await expect(quantity).toHaveValue('1.5');
});
