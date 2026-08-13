import { expect, test } from '@playwright/test';

test('loads every original catalog family, counts, columns, and filtering data', async ({ page }) => {
  await page.goto('/catalogue');
  await expect(page.getByRole('heading', { name: 'Catalogue matériel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modules (388)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Batteries (366)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Onduleurs (84)' })).toBeVisible();
  await expect(page.locator('.tbl tbody tr')).toHaveCount(60);
  await page.getByRole('button', { name: 'Batteries (366)' }).click();
  await expect(page.locator('.tbl thead')).toContainText('Capacité');
  await page.locator('.hdr-search').fill('no-match-ksd');
  await expect(page.locator('.tbl tbody tr')).toHaveCount(0);
});

test('recovers from the retained injected catalog adapter harness', async ({ page }) => {
  await page.goto('/catalog-error.html');
  await expect(page.getByRole('alert')).toContainText('Le catalogue canonique est indisponible.');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await expect(page.locator('.catalog-card').first()).toBeVisible();
});
