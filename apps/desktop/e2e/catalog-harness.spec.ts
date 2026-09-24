import { expect, test } from '@playwright/test';

test('recovers from the retained injected catalog adapter harness', async ({ page }) => {
  await page.goto('/catalog-error.html');
  await expect(page.getByRole('alert')).toContainText('Le catalogue matériel est indisponible.');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect(page.locator('.tbl tbody tr').first()).toBeVisible();
});
