import { expect, test } from '@playwright/test';

test('the original French and English shell copy switches without changing route or data', async ({ page }) => {
  await page.goto('/catalogue');
  await expect(page.getByRole('heading', { name: 'Catalogue matériel' })).toBeVisible();
  await page.locator('.topbar button[title="Langue"]').click();
  await expect(page).toHaveURL(/\/catalogue$/);
  await expect(page.getByRole('heading', { name: 'Equipment catalog' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modules (387)' })).toBeVisible();
  await page.locator('.topbar button[title="Langue"]').click();
  await expect(page.getByRole('heading', { name: 'Catalogue matériel' })).toBeVisible();
});

test('language choice survives navigation through the copied command palette', async ({ page }) => {
  await page.goto('/accueil');
  await page.locator('.topbar button[title="Langue"]').click();
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await page.locator('.topbar button[title="Palette de commandes"]').click();
  await page.locator('.palette-input').fill('réglages');
  await page.getByRole('button', { name: 'Ouvrir les réglages', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
