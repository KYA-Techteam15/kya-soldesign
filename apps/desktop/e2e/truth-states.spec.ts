import { expect, test } from '@playwright/test';

test('keeps Page 1 active and future calculated surfaces explicitly unavailable', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await expect(page.locator('.statusbar')).toContainText('Moteur Page 1 actif · AIO-001');
  await expect(page.locator('.statusbar')).toContainText('Calculs AIO traçables');

  await page.locator('.nav-item').nth(2).click();
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  await expect(page.locator('.t-classic tbody .derived').first()).toHaveText('100');
  await expect(page.locator('.t-classic tbody .derived').nth(1)).toHaveText('111');
  await expect(page.locator('.t-classic tbody .derived').nth(2)).toHaveText('444');
  await expect(page.locator('.pane-right')).toContainText('Ajoutez des appareils à l’étape Besoins et chargez une série météo à l’étape Site.');

  await page.locator('.nav-item').nth(3).click();
  await expect(page.getByRole('button', { name: 'Prédimensionnement indisponible' })).toBeDisabled();
  await expect(page.locator('.pane-center')).toContainText('UI-AIO-001B');

  await page.locator('.nav-item').nth(4).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par EQP-001');

  await page.locator('.nav-item').nth(5).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par SAFE-001');

  await page.locator('.nav-item').nth(6).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par FIN-001');

  await page.locator('.nav-item').nth(7).click();
  await expect(page.locator('.pane-center')).toContainText('Intégration prévue par DOC-001');
});
