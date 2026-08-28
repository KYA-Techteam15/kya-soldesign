import { expect, test } from '@playwright/test';

const WEATHER_FILE = 'packages/catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json';

test('Page 1 resolves real weather and calculates every needs mode through AIO', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.locator('.nav-item').nth(1).click();

  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  const town = page.getByRole('textbox', { name: 'Ville', exact: true });
  await town.pressSequentially('Bombouaka');
  await expect(town).toBeFocused();
  await expect(town).toHaveValue('Bombouaka');
  await page.getByText('Rechercher', { exact: true }).click();
  await expect(page.getByLabel('Coordonnées trouvées')).toHaveValue('10,7030° / 0,2099°');
  await expect(page.getByLabel('Fuseau trouvé')).toHaveValue('Africa/Lome');
  await page.getByRole('button', { name: 'Télécharger', exact: true }).click();
  await expect(page.getByText(/SHA-256 05dffc44112a/)).toBeVisible();
  await expect(page.getByText(/8 760 heures et leur preuve/)).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();

  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  await page.getByRole('button', { name: 'Par coordonnées' }).click();
  const latitude = page.getByLabel('Latitude', { exact: true });
  await latitude.pressSequentially('10,70abc30.9');
  await expect(latitude).toBeFocused();
  await expect(latitude).toHaveValue('10,70309');
  await latitude.fill('10,7030');
  await page.getByLabel('Longitude', { exact: true }).fill('0,2099');
  await page.getByText('Rechercher', { exact: true }).click();
  await expect(page.getByLabel('Nom du site')).toHaveValue('Bombouaka');
  await page.getByRole('button', { name: 'Télécharger', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer dans le dossier', exact: true }).last().click();
  await expect(page.locator('.pickfield')).toContainText('Bombouaka');
  await expect(page.getByRole('img', { name: 'Irradiation mensuelle' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Irradiance horaire moyenne/ })).toBeVisible();
  await expect(page.getByLabel('Irradiation mois 8')).toHaveValue('4,6');

  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  await page.getByRole('button', { name: 'Depuis un fichier' }).click();
  await page.getByLabel('Nom du site').fill('Bombouaka importé');
  await page.getByLabel('Pays').selectOption('TG');
  await page.getByLabel('Fuseau horaire IANA').fill('Africa/Lome');
  await page.locator('.modal input[type="file"]').setInputFiles(WEATHER_FILE);
  await expect(page.getByText(/SHA-256 05dffc44112a/)).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();

  await page.locator('.nav-item').nth(2).click();
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  await expect(page.locator('.t-classic').getByLabel('Nom').first()).toHaveValue('Nouvel appareil');
  await expect(page.locator('.t-classic').getByLabel('Rendement').first()).toHaveValue('0,90');
  await expect(page.locator('.t-classic').getByLabel("Heures d'usage").first()).toHaveValue('4');
  await expect(page.locator('.t-classic tbody .derived').nth(2)).toHaveText('444');

  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).last().click();
  await expect(page.locator('.t-induct').getByLabel('Nom').first()).toHaveValue('Nouveau moteur');
  await expect(page.getByLabel('Coefficient de démarrage')).toHaveValue('3,0');
  await expect(page.locator('.t-induct tbody .derived').nth(2)).toHaveText('1 176');

  await page.getByLabel("Heures d'usage").first().fill('2,5');
  await page.getByRole('button', { name: 'Ajuster les heures…' }).click();
  await expect(page.getByRole('checkbox', { name: '08:00 - 09:00' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: '10:00 - 11:00' })).toBeChecked();
  await expect(page.getByText('0.5 h', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('img', { name: /Profil de charge horaire/ })).toBeVisible();
  await expect(page.locator('.pane-right')).toContainText('1,45');
  await expect(page.locator('.pane-right')).toContainText('1,88');

  await page.getByRole('tab', { name: 'Saisir heure par heure' }).click();
  await page.getByLabel('Puissance à 0 h').fill('0,2');
  await expect(page.getByLabel('Puissance de pointe à 0 h')).toHaveValue('0,20');
  await expect(page.getByRole('img', { name: /Profil de charge horaire/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Partir de la facture' }).click();
  await page.getByLabel('Énergie de la période observée').fill('31');
  await page.getByLabel('Nombre exact de jours').fill('31');
  await page.getByLabel('Profil horaire sourcé').selectOption({ index: 1 });
  await expect(page.getByRole('img', { name: /Profil de charge horaire/ })).toBeVisible();
  await expect(page.getByText('YEn calculé').locator('..').locator('b')).not.toHaveText('—');
  await page.getByRole('checkbox', { name: 'Forcer le YEn avec la météo locale' }).check();
  await page.getByLabel('YEn cible').fill('75');
  await expect(page.getByText('YEn calculé').locator('..').locator('b')).toHaveText('75,0 %');
});
