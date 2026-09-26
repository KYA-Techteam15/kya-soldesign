import { expect, test, type Page } from '@playwright/test';
import { useFakePlatform } from './support/licence';

/**
 * Spec 012, lot D et T061 : licence délivrée par la plateforme (ici une fausse plateforme, clé de
 * test), éditions, fonctions ouvertes, limite de projets, lecture seule.
 */
test.beforeEach(async ({ page }) => {
  await useFakePlatform(page);
});

async function activate(page: Page, key: string) {
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  await page.getByRole('textbox', { name: 'Clé de licence' }).fill(key);
  await page.getByRole('button', { name: 'Activer', exact: true }).click();
  await expect(page.getByText('Licence activée')).toBeVisible();
}

/** Un brouillon jamais touché est écarté : chaque projet reçoit un nom. */
async function newProject(page: Page, name: string) {
  await page.locator('.wordmark').click();
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.getByLabel('Nom du projet').fill(name);
}

test('the licence activated on this computer shows in the status bar', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page.locator('.statusbar .license-badge')).toHaveText('Commerciale · 365 j');
  await page.locator('.statusbar .license-badge').click();
  await expect(page.locator('#licence')).toContainText('Commerciale · 1 an');
  await expect(page.locator('#licence .license-features li.is-closed')).toHaveCount(0);
});

test('the student edition closes its features and caps the number of projects', async ({ page }) => {
  await page.goto('/accueil');
  await activate(page, 'KYA-ETU-1M-TEST');
  await expect(page.locator('.statusbar .license-badge')).toHaveText('Étudiant · 30 j');
  await expect(page.locator('#licence .license-features li.is-closed')).toHaveCount(5);

  await page.getByRole('button', { name: 'Catalogue', exact: true }).click();
  await expect(page.getByRole('button', { name: /Ajouter/ })).toBeDisabled();

  for (let index = 1; index <= 5; index += 1) await newProject(page, `Projet ${index}`);
  await page.locator('.wordmark').click();
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await expect(page.getByText('Nombre de projets de l’édition atteint.')).toBeVisible();
  await expect(page).toHaveURL(/\/accueil$/u);
});

test('releasing the computer leaves projects readable but not editable', async ({ page }) => {
  await page.goto('/accueil');
  await newProject(page, 'Projet Lomé');
  const project = new URL(page.url()).pathname;

  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  await page.getByRole('button', { name: 'Libérer ce poste' }).click();
  await page.locator('.modal').getByRole('button', { name: 'Libérer ce poste' }).click();
  await expect(page.locator('.statusbar .license-badge')).toHaveText('Aucune licence');

  await page.goto(project);
  await expect(page.getByText('Lecture seule.')).toBeVisible();
  await expect(page.getByLabel('Nom du projet')).toBeDisabled();

  // Une nouvelle activation rend la main.
  await activate(page, 'KYA-COM-12M-TEST');
  await page.goto(project);
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Projet Lomé');
  await expect(page.locator('fieldset.ro-lock')).toHaveCount(0);
});

test.describe('without any licence (T061)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the software opens read-only and points to the trial and purchase', async ({ page }) => {
    await page.goto('/accueil');
    await expect(page.locator('.statusbar .license-badge')).toHaveText('Aucune licence');
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    await expect(page.locator('#licence')).toContainText('essai gratuit ou achat');
    await expect(page.getByRole('button', { name: 'Essai gratuit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acheter une licence' })).toBeVisible();
    await expect(page.locator('#licence')).not.toContainText('Clés de démonstration');
    // Une clé reçue de la plateforme ouvre le travail.
    await activate(page, 'KYA-COM-12M-TEST');
    await expect(page.locator('.statusbar .license-badge')).toHaveText('Commerciale · 365 j');
  });

  test('an unknown key is refused by the platform', async ({ page }) => {
    await page.goto('/accueil');
    await page.getByRole('button', { name: 'Réglages', exact: true }).click();
    await page.getByRole('textbox', { name: 'Clé de licence' }).fill('KYA-COM-12M-FAUX');
    await page.getByRole('button', { name: 'Activer', exact: true }).click();
    await expect(page.getByText('Cette clé est inconnue de la plateforme.')).toBeVisible();
  });
});
