import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.setTimeout(90_000);

test('top-level views have no automatically detectable accessibility violations', async ({ page }) => {
  for (const route of ['/accueil', '/accueil/projets', '/catalogue', '/reglages', '/adresse-inconnue']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});

test('command palette keeps keyboard focus and closes on Escape', async ({ page }) => {
  await page.goto('/accueil');
  const opener = page.getByRole('button', { name: /Rechercher une action/ });
  await opener.focus();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Rechercher une action' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Réglages', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Rechercher une action' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();
});

test('confirm dialog restores focus after Escape', async ({ page }) => {
  await page.goto('/accueil'); await page.getByRole('button', { name: 'Créer l’étude' }).click(); await page.getByRole('link', { name: /Retour aux projets/ }).click();
  const remove = page.getByRole('button', { name: 'Supprimer' });
  await remove.click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden(); await expect(remove).toBeFocused();
});

test('workshop has no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Créer l’étude' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
