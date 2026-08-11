import { expect, test } from '@playwright/test';

test('provides eight workshop steps and browser navigation', async ({ page }) => {
  await page.goto('/accueil'); await page.getByRole('button', { name: 'Créer l’étude' }).click();
  await expect(page.locator('.rail-step')).toHaveCount(8);
  const steps = [
    ['projet', 'Identification du projet'], ['site', 'Choix du site'], ['besoins', 'Bilan des consommations'],
    ['predimensionnement', 'Prédimensionnement'], ['materiel', 'Dimensionnement'], ['protections', 'Protections et câblerie'],
    ['finance', 'Évaluation financière'], ['dossier', 'Vue synoptique et rapports'],
  ] as const;
  for (const [id, heading] of steps) {
    await page.getByRole('button', { name: new RegExp(heading) }).click();
    await expect(page).toHaveURL(new RegExp(`/atelier/${id}$`));
    await expect(page.locator('.workshop-head h1')).toHaveText(heading);
    await expect(page.getByRole('button', { name: new RegExp(heading) })).toHaveAttribute('aria-current', 'step');
  }
  await page.goBack();
  await expect(page.locator('.workshop-head h1')).toHaveText('Évaluation financière');
  await page.goForward();
  await expect(page.locator('.workshop-head h1')).toHaveText('Vue synoptique et rapports');
  const projectUrl = page.url();
  await page.evaluate((url) => { history.pushState({}, '', url.replace('/dossier', '/inconnue')); dispatchEvent(new PopStateEvent('popstate')); }, projectUrl);
  await expect(page.getByText('Cette étape d’atelier n’existe pas.')).toBeVisible();
  await page.getByRole('link', { name: /Retour aux projets/ }).click();
  await expect(page).toHaveURL(/\/accueil\/projets$/);
});
