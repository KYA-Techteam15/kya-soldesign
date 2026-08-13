import { expect, test } from '@playwright/test';

test('preserves all eight original workshop routes, labels, and browser navigation', async ({ page }) => {
  await page.goto('/projet/p-2026-041/atelier/projet');
  await expect(page.locator('.nav-item')).toHaveCount(8);
  const steps = [
    ['projet', 'Identification du projet'], ['site', 'Choix du site'], ['besoins', 'Bilan des consommations'],
    ['hypotheses', 'Prédimensionnement'], ['materiel', 'Dimensionnement'],
    ['protections', 'Choix des éléments de protection et de la câblerie'],
    ['chiffrage', 'Évaluation financière'], ['dossier', 'Vue synoptique et rapports'],
  ] as const;
  for (const [index, [slug, heading]] of steps.entries()) {
    await page.locator('.nav-item').nth(index).click();
    await expect(page).toHaveURL(new RegExp(`/atelier/${slug}$`));
    await expect(page.locator('.stephead .h-page')).toHaveText(heading);
    await expect(page.locator('.nav-item').nth(index)).toHaveAttribute('aria-current', 'page');
  }
  await page.goBack();
  await expect(page.locator('.stephead .h-page')).toHaveText('Évaluation financière');
  await page.goForward();
  await expect(page.locator('.stephead .h-page')).toHaveText('Vue synoptique et rapports');
});
