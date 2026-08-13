import { expect, test } from '@playwright/test';

test('constrained desktop and 200% text retain reachable primary actions without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/accueil');
  await expect(page.getByRole('button', { name: 'Nouveau projet' })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(page.getByRole('button', { name: 'Nouveau projet' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('workshop remains usable at constrained desktop with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/accueil'); await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click(); await page.locator('.nav-item').nth(7).click();
  await expect(page.locator('.stepnext .btn-ghost')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect(page.locator('.stepnext .btn-ghost')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
