import { expect, test } from '@playwright/test';

test('keeps Page 1 active and future calculated surfaces explicitly unavailable', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  // La barre d'état rend compte de l'enregistrement du dossier, pas du fonctionnement interne.
  await expect(page.locator('.statusbar')).toContainText('Enregistré');

  await page.locator('.nav-item').nth(2).click();
  await page.getByRole('button', { name: /La liste des appareils/ }).click();
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  await expect(page.locator('.t-appliances tbody td.derived').first()).toHaveText('100');
  await expect(page.locator('.t-appliances tbody td.derived').nth(1)).toHaveText('111');
  await expect(page.locator('.t-appliances tbody td.derived').nth(2)).toHaveText('444');
  await expect(page.locator('.pane-right .dayb')).toContainText('Ajoutez des appareils à l’étape Besoins et chargez une série météo à l’étape Site.');

  await page.locator('.nav-item').nth(3).click();
  await expect(page.getByRole('button', { name: 'Lancer le prédimensionnement' })).toBeEnabled();
  await expect(page.locator('.pane-center')).toContainText('Prédimensionnement');

  await page.locator('.nav-item').nth(4).click();
  await expect(page.locator('.pane-center')).toContainText('Dimensionnement');

  await page.locator('.nav-item').nth(5).click();
  await expect(page.locator('.pane-center')).toContainText('Choix des éléments de protection');

  await page.locator('.nav-item').nth(6).click();
  await expect(page.locator('.pane-center')).toContainText('Évaluation financière');

  await page.locator('.nav-item').nth(7).click();
  await expect(page.locator('.pane-center')).toContainText('Vue synoptique et rapports');
});
