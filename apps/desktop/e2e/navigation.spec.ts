import { expect, test } from '@playwright/test';

test('restores the validated home with six systems and an empty production session', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page.getByRole('heading', { name: 'Concevez des systèmes solaires fiables' })).toBeVisible();
  // Un seul parcours est disponible ; les cinq autres architectures sont annoncées, pas proposées.
  await expect(page.locator('.sys-card')).toHaveCount(1);
  await expect(page.locator('.sys-card')).toContainText('Disponible');
  await expect(page.getByText('Architectures à venir :')).toBeVisible();
  await expect(page.locator('.home-resume.is-empty')).toContainText('Aucun projet');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await expect(page).toHaveURL(/\/projet\/[0-9a-f-]{36}\/atelier\/projet$/);
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
  await expect(page.getByRole('heading', { name: 'Concevez des systèmes solaires fiables' })).toBeVisible();
});
