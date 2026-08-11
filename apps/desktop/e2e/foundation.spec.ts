import { expect, test } from '@playwright/test';

test('shows a truthful foundation state without fake calculations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fondation de production prête' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Aucun résultat de dimensionnement');
});

test('@visual foundation rendering remains stable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('foundation-screen')).toHaveScreenshot('foundation-screen.png');
});

