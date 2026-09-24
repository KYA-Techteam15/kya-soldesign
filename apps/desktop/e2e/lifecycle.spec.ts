import { expect, test } from '@playwright/test';

/** Projet exemple, émission, lecture seule, révision et réimpression (spec 011, FR-007 → FR-011). */
test('issues the example file, locks it, opens a revision and reprints the issued version', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Ouvrir le projet exemple →' }).click();
  await expect(page).toHaveURL(/\/projet\/[0-9a-f-]{36}\/atelier\/projet$/, { timeout: 60_000 });
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Centre de santé de Bombouaka (exemple)');

  await page.locator('.nav-item').nth(7).click();
  const issue = page.getByRole('button', { name: 'Émettre le dossier v1' });
  await expect(issue).toBeEnabled({ timeout: 30_000 });
  await issue.click();
  await page.locator('.modal').getByRole('button', { name: 'Émettre', exact: true }).click();
  await expect(page.locator('.lifecycle-banner')).toContainText('Dossier émis — v1');

  // Chaque étape se lit, rien ne se modifie.
  await page.locator('.nav-item').nth(0).click();
  await expect(page.locator('.lifecycle-banner')).toContainText('Lecture seule');
  await expect(page.getByLabel('Nom du projet')).toBeDisabled();

  await page.locator('.lifecycle-banner').getByRole('button', { name: 'Créer une révision (v2)' }).click();
  await expect(page.locator('.lifecycle-banner')).toContainText('Révision v2 en cours');
  await expect(page.getByLabel('Nom du projet')).toBeEnabled();
  await page.getByLabel('Nom du projet').fill('Centre de santé révisé');

  // La v1 reste réimprimable telle qu'elle a été remise.
  await page.locator('.nav-item').nth(7).click();
  await page.locator('.issue-versions').getByRole('button', { name: 'Voir les documents' }).click();
  await expect(page.locator('.issued-version-note')).toContainText('Version v1');
  await expect(page.locator('.a4-stack')).toContainText('Centre de santé de Bombouaka (exemple)');
  await expect(page.locator('.a4-stack')).toContainText('v1');
  await page.getByRole('button', { name: 'Revenir au dossier en cours' }).click();

  await page.locator('.wordmark').click();
  await expect(page.locator('.home-table')).toContainText('Centre de santé révisé');
  await expect(page.locator('.home-table')).toContainText('v2');
});
