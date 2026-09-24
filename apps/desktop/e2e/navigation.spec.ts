import { expect, test } from '@playwright/test';

test('first launch offers three ways to start, then the dashboard resumes where the file waits', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page.getByRole('heading', { name: 'Bienvenue dans KYA-SolDesign' })).toBeVisible();
  await expect(page.locator('.home-start-card')).toHaveCount(3);
  // Le système disponible est montré avec son schéma ; les cinq autres montrent le leur au survol.
  await expect(page.getByRole('img', { name: 'Schéma : Autonome · onduleur tout-en-un' })).toBeVisible();
  await expect(page.locator('.upcoming-chip')).toHaveCount(5);
  const upcoming = page.locator('.upcoming-chip').first();
  await expect(upcoming.locator('.upcoming-preview')).toBeHidden();
  await upcoming.hover();
  await expect(upcoming.locator('.upcoming-preview img')).toBeVisible();
  await page.getByRole('button', { name: 'Créer un projet →' }).click();
  await expect(page).toHaveURL(/\/projet\/[0-9a-f-]{36}\/atelier\/projet$/);
  await expect(page.locator('.stephead .h-page')).toHaveText('Identification du projet');
  await page.locator('.wordmark').click();
  await expect(page.getByRole('heading', { name: 'Vos projets' })).toBeVisible();
  await expect(page.locator('.home-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.home-table')).toContainText('Brouillon');
  await page.getByRole('button', { name: /^Émis \d+$/ }).click();
  await expect(page.locator('.home-table')).toHaveCount(0);
  await page.getByRole('button', { name: /^Tous \d+$/ }).click();
  await page.getByRole('button', { name: /Continuer à l’étape 1/ }).click();
  await expect(page.locator('.stephead .h-page')).toHaveText('Identification du projet');
});

test('a created project can be filtered and removed through the original dialog', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.getByLabel('Nom du projet').fill('Projet Bombouaka');
  await page.locator('.wordmark').click();
  await page.getByRole('button', { name: 'Tous les projets →', exact: true }).click();
  await page.locator('.hdr-search').fill('Bombouaka');
  await expect(page.locator('.proj-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.locator('.modal')).toContainText('Supprimer ce projet ?');
  await page.locator('.modal').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByText('Aucun projet trouvé')).toBeVisible();
});

test('unknown projects keep the original recoverable state', async ({ page }) => {
  await page.goto('/projet/inconnu/atelier/projet');
  await expect(page.getByText('Projet introuvable')).toBeVisible();
  await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
  await expect(page).toHaveURL(/\/accueil$/);
});

test('unknown application routes use the original redirect to home', async ({ page }) => {
  await page.goto('/adresse-inconnue');
  await expect(page).toHaveURL(/\/accueil$/);
  await expect(page.getByRole('heading', { name: 'Bienvenue dans KYA-SolDesign' })).toBeVisible();
});
