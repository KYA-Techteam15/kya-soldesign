import { expect, test } from '@playwright/test';

test('Page 1 uses the verified weather file and calculates every needs mode through AIO', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(1).click();

  await page.locator('.pickfield').click();
  await page.getByPlaceholder('Rechercher une ville…').fill('Bombouaka');
  await page.locator('.proj-row').filter({ hasText: 'Bombouaka' }).click();
  const irradiation = page.locator('.ro-field').filter({ hasText: 'Irradiation moyenne' });
  await expect(irradiation).toContainText('6,15');
  await expect(page.getByRole('img', { name: 'Irradiation mensuelle' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Irradiance horaire moyenne/ })).toBeVisible();
  await expect(page.getByLabel('Irradiation mois 8')).toHaveValue('4,5');
  await expect(page.getByText(/recommandation à confirmer Août/)).toBeVisible();
  await page.getByLabel('Mois critique déclaré').selectOption('8');
  await expect(page.getByText(/mois critique déclaré Août/)).toBeVisible();

  await page.getByRole('textbox', { name: /Inclinaison °/ }).fill('25');
  await expect(irradiation).toContainText('6,06');

  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  await page.getByRole('button', { name: 'Charger le JSON vérifié' }).click();
  await expect(page.getByText(/SHA-256 05dffc44112a/)).toBeVisible();
  await expect(page.getByText(/conserve les 8 760 lignes/)).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  await page.getByRole('button', { name: 'Depuis un fichier' }).click();
  await page.getByLabel('Nom du site').fill('Bombouaka importé');
  await page.getByLabel('Code pays').fill('TG');
  await page.locator('.modal input[type="file"]').setInputFiles('packages/catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json');
  await expect(page.getByText(/SHA-256 05dffc44112a/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer dans le dossier' }).click();
  await expect(page.locator('.pickfield')).toContainText('Bombouaka importé');
  await page.getByLabel('Mois critique déclaré').selectOption('8');

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
  await expect(page.getByRole('img', { name: 'Charge moyenne, pointe et irradiance solaire sur 24 heures' })).toBeVisible();
  await expect(page.locator('.curve-legend')).toContainText('γ 0,500');

  await page.getByRole('tab', { name: 'Saisir heure par heure' }).click();
  await page.getByLabel('Puissance à 0 h').fill('0,2');
  await expect(page.getByLabel('Puissance de pointe à 0 h')).toHaveValue('0,20');
  await expect(balance).toContainText('200');
  await expect(page.locator('.curve-legend')).toContainText('Énergie 200 Wh/j');

  await page.getByRole('tab', { name: 'Partir de la facture' }).click();
  const observedEnergy = page.locator('.form-rows label').filter({ hasText: 'Énergie de la période observée' }).locator('input');
  await expect(observedEnergy).toBeVisible();
  await observedEnergy.fill('31');
  await page.getByLabel('Nombre exact de jours').fill('31');
  await page.getByLabel('Profil horaire sourcé').selectOption({ index: 1 });
  await expect(balance).toContainText('1 000');
  await expect(balance).toContainText('Bloqué');
  await expect(page.getByRole('img', { name: 'Charge moyenne, pointe et irradiance solaire sur 24 heures' })).toBeVisible();
});
