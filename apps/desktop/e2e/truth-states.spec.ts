import { expect, test } from '@playwright/test';

test('keeps calculated surfaces truthful when production capabilities are unavailable', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Calculs indisponibles · AIO-001');
  await expect(page.locator('.statusbar')).toContainText('Aucun résultat simulé');

  await page.locator('.nav-item').nth(2).click();
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  await expect(page.locator('.pane-center')).toContainText('Dimensionnement indisponible');
  await expect(page.locator('.t-classic tbody .derived').first()).toHaveText('—');

  await page.locator('.nav-item').nth(3).click();
  await expect(page.getByRole('button', { name: 'Prédimensionnement indisponible' })).toBeDisabled();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par AIO-001');

  await page.locator('.nav-item').nth(4).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par EQP-001');

  await page.locator('.nav-item').nth(5).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par SAFE-001');

  await page.locator('.nav-item').nth(6).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par FIN-001');

  await page.locator('.nav-item').nth(7).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par DOC-001');
});
