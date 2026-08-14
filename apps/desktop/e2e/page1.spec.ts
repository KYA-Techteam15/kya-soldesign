import { expect, test } from '@playwright/test';

test('Page 1 calculates equipment, direct and metered inputs through AIO', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(1).click();
  await page.getByLabel('Fuseau horaire IANA').fill('Africa/Lome');
  await page.locator('.nav-item').nth(2).click();

  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  await page.getByLabel('Nom').first().fill('Éclairage');
  await page.getByLabel('Quantité').first().fill('2');
  await page.getByLabel('Puissance unitaire').first().fill('100');
  await page.getByLabel('Rendement').first().fill('1');
  await page.getByLabel('Simultanéité').first().fill('0,5');
  await page.getByRole('button', { name: '0 h', exact: true }).click();
  await page.getByRole('button', { name: 'Toute la journée', exact: true }).click();
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page.getByRole('button', { name: '24 h', exact: true })).toBeFocused();
  const balance = page.locator('section.out').filter({ hasText: 'Bilan calculé de la Page 1' });
  await expect(balance).toContainText('2 400');
  await expect(balance).toContainText('100');
  await expect(balance.getByText(/Preuve du calcul · AIO 1\.0\.0/)).toBeVisible();

  await page.getByRole('tab', { name: 'Saisir heure par heure' }).click();
  await page.getByLabel('Puissance à 0 h').fill('0,2');
  await expect(page.getByLabel('Puissance de pointe à 0 h')).toHaveValue('0,20');
  await expect(balance).toContainText('200');

  await page.getByRole('tab', { name: 'Partir de la facture' }).click();
  const observedEnergy = page.locator('.form-rows label').filter({ hasText: 'Énergie de la période observée' }).locator('input');
  await expect(observedEnergy).toBeVisible();
  await observedEnergy.fill('31');
  await page.getByLabel('Nombre exact de jours').fill('31');
  await page.getByLabel('Profil horaire sourcé').selectOption({ index: 1 });
  await expect(balance).toContainText('1 000');
  await expect(balance).toContainText('Bloqué');
});
