import { expect, test } from '@playwright/test';

test('starts empty, exposes six system families, and opens an AIO draft', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
  await expect(page.locator('.system-card')).toHaveCount(6);
  await expect(page.locator('.system-card button:disabled')).toHaveCount(5);
  await expect(page.getByText('Disponible dans une prochaine phase')).toHaveCount(10);
  await expect(page.getByText('Aucune étude dans cette session.')).toBeVisible();
  await page.getByRole('button', { name: 'Créer l’étude' }).click();
  await expect(page).toHaveURL(/\/projet\/[^/]+\/atelier\/projet$/);
  await expect(page.locator('.workshop-head h1')).toHaveText('Identification du projet');
});

test('projects can be filtered and removed from the in-memory session', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Créer l’étude' }).click();
  await page.getByRole('link', { name: /Retour aux projets/ }).click();
  await page.getByRole('button', { name: /Nouvelle étude AIO/ }).click();
  await expect(page).toHaveURL(/\/atelier\/projet$/);
  await page.getByRole('link', { name: /Retour aux projets/ }).click();
  await expect(page.getByRole('button', { name: 'Supprimer' })).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.getByText('Aucun projet dans la session courante.')).toBeVisible();
});

test('unknown project cannot be opened', async ({ page }) => {
  await page.goto('/projet/00000000-0000-0000-0000-000000000000/atelier/projet');
  await expect(page.getByText('Cette étude n’existe pas dans la session courante.')).toBeVisible();
});

test('unknown application route is explicit and recoverable', async ({ page }) => {
  await page.goto('/adresse-inconnue');
  await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  await page.getByRole('link', { name: 'Accueil' }).click();
  await expect(page).toHaveURL(/\/accueil$/);
});
