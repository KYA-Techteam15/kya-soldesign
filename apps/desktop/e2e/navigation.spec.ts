import { expect, test } from '@playwright/test';

test('restores the validated home with its six systems and three complete fixture projects', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
  await expect(page.locator('.sys-card')).toHaveCount(6);
  await expect(page.locator('.sys-card:disabled')).toHaveCount(5);
  await expect(page.locator('.proj-row')).toHaveCount(3);
  await expect(page.getByText('Électrification centre de santé')).toBeVisible();
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await expect(page).toHaveURL(/\/projet\/p-[^/]+\/atelier\/projet$/);
  await expect(page.locator('.stephead .h-page')).toHaveText('Identification du projet');
});

test('projects can be filtered and a fixture can be removed through the original dialog', async ({ page }) => {
  await page.goto('/accueil/projets');
  await expect(page.locator('.proj-row')).toHaveCount(3);
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
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
});
