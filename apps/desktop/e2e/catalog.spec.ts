import { expect, test } from '@playwright/test';

test('loads, filters, and attributes the canonical equipment catalog', async ({ page }) => {
  await page.goto('/catalogue');
  await expect(page.locator('.catalog-card').first()).toBeVisible();
  await expect(page.getByText(/Source vérifiée/).first()).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/compatible|recommand[ée]|quantité conseillée/i);
  await page.getByRole('combobox', { name: 'Tous les types' }).selectOption('battery');
  await expect(page.locator('.catalog-card')).not.toHaveCount(0);
  await page.getByRole('textbox', { name: 'Rechercher un fabricant ou un modèle' }).fill('no-match-ksd');
  await expect(page.getByText('Aucun équipement ne correspond au filtre.')).toBeVisible();
});

test('recovers from an injected catalog adapter error', async ({ page }) => {
  await page.goto('/catalog-error.html');
  await expect(page.getByRole('alert')).toContainText('Le catalogue canonique est indisponible.');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect(page.locator('.catalog-card').first()).toBeVisible();
});
