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
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();

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
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();

  await page.locator('.nav-item').nth(2).click();
  // Étape vide : on part de ce dont on dispose.
  await expect(page.getByRole('heading', { name: 'De quoi disposez-vous ?' })).toBeVisible();
  await page.getByRole('button', { name: /La liste des appareils/ }).click();
  const appliances = page.locator('.t-appliances');
  const addRow = page.getByRole('button', { name: '+ Ajouter une ligne', exact: true });
  await addRow.click();
  await expect(appliances.getByLabel('Nom').first()).toHaveValue('Nouvel appareil');
  await expect(appliances.getByLabel('Rendement').first()).toHaveValue('0,90');
  await expect(appliances.getByLabel("Heures d'usage").first()).toHaveValue('4');
  await expect(appliances.getByLabel('Coefficient de démarrage').first()).toHaveValue('1');
  await expect(appliances.getByRole('checkbox').first()).not.toBeChecked();
  await expect(appliances.locator('tbody tr').first().locator('td.derived').nth(2)).toHaveText('444');

  // Un coefficient de démarrage différent de 1 rend l'appareil inductif.
  await addRow.click();
  const motor = appliances.locator('tbody tr').nth(1);
  await motor.getByLabel('Nom').fill('Moteur');
  await motor.getByLabel('Puissance unitaire').fill('500');
  await motor.getByLabel('Rendement').fill('0,85');
  await motor.getByLabel("Heures d'usage").fill('2');
  await motor.getByLabel('Coefficient de démarrage').fill('3');
  await page.keyboard.press('Tab');
  await expect(motor.getByRole('checkbox')).toBeChecked();
  await expect(motor.locator('td.derived').nth(2)).toHaveText('1 176');
  await expect(appliances.locator('.startup-peak')).toBeVisible();

  // La durée raccourcit le dernier bloc ; l'horaire se lit au survol et se règle au clic.
  await appliances.getByLabel("Heures d'usage").first().fill('2,5');
  await page.keyboard.press('Tab');
  await appliances.locator('.hours-open').first().click();
  await expect(page.locator('.hpop').getByRole('button', { name: '08:00–09:00' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hpop').getByRole('button', { name: '10:00–11:00' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hpop').getByRole('button', { name: '11:00–12:00' })).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.hpop').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByRole('img', { name: /Profil de charge horaire/ })).toBeVisible();
  await expect(page.locator('.pane-right .dayb')).toContainText('1,45');
  await expect(page.locator('.pane-right .dayb')).toContainText('1,88');

  // Changer de source conserve les appareils ; la journée type a ses propres valeurs.
  await page.getByRole('tab', { name: 'Journée type' }).click();
  await page.getByLabel('Puissance à 0 h').fill('0,2');
  await expect(page.getByLabel('Puissance de pointe à 0 h')).toHaveValue('');
  await expect(page.getByLabel('Puissance de pointe à 0 h')).toHaveAttribute('placeholder', '=');
  await page.getByRole('tab', { name: 'Appareils' }).click();
  await expect(page.locator('.t-appliances tbody tr')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Journée type' }).click();
  await expect(page.getByLabel('Puissance à 0 h')).toHaveValue('0,20');
  await expect(page.getByRole('img', { name: /Profil de charge horaire/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Facture' }).click();
  await page.getByLabel('Énergie de la période observée').fill('31');
  await page.getByLabel('Nombre exact de jours').fill('31');
  await page.getByLabel('Profil horaire sourcé').selectOption({ index: 1 });
  await expect(page.getByRole('img', { name: /Profil de charge horaire/ })).toBeVisible();
  await expect(page.getByText('Part au soleil calculée').locator('..').locator('b')).not.toHaveText('—');
  await page.getByRole('checkbox', { name: 'Imposer la part consommée au soleil (météo locale)' }).check();
  await page.getByLabel('Part au soleil visée').fill('75');
  await expect(page.getByText('Part au soleil calculée').locator('..').locator('b')).toHaveText('75,0 %');
});
