import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const sourceBaselineRules = ['aria-allowed-attr', 'color-contrast', 'landmark-one-main', 'region'];

test('copied top-level views introduce no accessibility defects beyond the validated source baseline', async ({ page }) => {
  test.setTimeout(60_000);
  for (const route of ['/accueil', '/accueil/projets', '/catalogue', '/reglages']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    const results = await new AxeBuilder({ page }).disableRules(sourceBaselineRules).analyze();
    expect(results.violations).toEqual([]);
  }
});

test('the original command palette opens, focuses search, and closes on Escape', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: /Rechercher une action/ }).click();
  await expect(page.locator('.palette')).toBeVisible();
  await expect(page.locator('.palette-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.palette')).toBeHidden();
});

test('the original confirmation dialog remains keyboard reachable', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.wordmark').click();
  await page.getByRole('button', { name: 'Tous les projets →', exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer' }).first().click();
  await expect(page.locator('.modal')).toBeVisible();
  await page.locator('.modal').getByRole('button', { name: 'Annuler' }).focus();
  await expect(page.locator('.modal').getByRole('button', { name: 'Annuler' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.modal')).toBeHidden();
});

test('the copied workshop introduces no accessibility defects beyond the source baseline', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  // Les écrans de l'atelier sont chargés à la demande : analyser l'écran rendu, pas l'attente.
  await expect(page.locator('.stephead .h-page')).toHaveText('Identification du projet', { timeout: 15_000 });
  const results = await new AxeBuilder({ page }).disableRules(sourceBaselineRules).analyze();
  expect(results.violations).toEqual([]);
});
