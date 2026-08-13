import { expect, test } from '@playwright/test';

test('retains the complete Bombouaka reference study and its calculated outputs', async ({ page }) => {
  await page.goto('/projet/p-2026-041/atelier/projet');
  await expect(page.locator('input[value="District Sanitaire de Bombouaka"]')).toBeVisible();
  await page.goto('/projet/p-2026-041/atelier/site');
  await expect(page.locator('.pane-center')).toContainText('Bombouaka');
  await page.goto('/projet/p-2026-041/atelier/besoins');
  await expect(page.locator('input[value="Réfrigérateur à vaccins"]')).toBeVisible();
  await expect(page.locator('input[value="Pompe à eau de surface"]')).toBeVisible();
  await page.goto('/projet/p-2026-041/atelier/hypotheses');
  await page.getByRole('button', { name: 'Lancer le prédimensionnement' }).click();
  await expect(page.locator('.pane-center')).toContainText(/121 combinaisons/);
  await page.goto('/projet/p-2026-041/atelier/materiel');
  await expect(page.locator('.pane-center')).toContainText(/84 onduleurs/);
  await page.goto('/projet/p-2026-041/atelier/chiffrage');
  await expect(page.locator('.pane-center')).toContainText('Total TTC');
  await page.goto('/projet/p-2026-041/atelier/dossier');
  await expect(page.getByRole('heading', { name: 'Vue synoptique et rapports' })).toBeVisible();
});
