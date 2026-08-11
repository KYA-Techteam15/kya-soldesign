import { expect, test } from '@playwright/test';

test('French and English copy switch without route reset', async ({ page }) => {
  await page.goto('/catalogue');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page).toHaveURL(/\/catalogue$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Equipment catalog' })).toBeVisible();
  await page.getByRole('button', { name: 'Passer au français' }).click();
  await expect(page.getByRole('heading', { name: 'Catalogue matériel' })).toBeVisible();
});

test('English covers top-level routes and all workshop steps while preserving the draft', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  for (const [destination, heading] of [['Projects', 'Projects'], ['Catalog', 'Equipment catalog'], ['Settings', 'Settings'], ['Home', 'Welcome']] as const) {
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog').getByRole('button', { name: destination, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
  await page.getByRole('button', { name: 'Create study' }).click();
  const name = page.getByRole('textbox', { name: 'Study name' });
  await name.fill('Lomé clinic');
  await page.getByRole('button', { name: 'Save information' }).click();
  const steps = ['Project identification', 'Site selection', 'Consumption assessment', 'Pre-sizing', 'Equipment sizing', 'Protection devices and wiring', 'Financial assessment', 'System diagram and reports'];
  for (const heading of steps) {
    await page.getByRole('button', { name: new RegExp(heading) }).click();
    await expect(page.locator('.workshop-head h1')).toHaveText(heading);
  }
  await page.getByRole('button', { name: /Project identification/ }).click();
  await expect(page.getByRole('textbox', { name: 'Study name' })).toHaveValue('Lomé clinic');
});
