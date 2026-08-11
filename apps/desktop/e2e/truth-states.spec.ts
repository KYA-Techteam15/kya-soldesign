import { expect, test } from '@playwright/test';

test('shows only owned unavailable calculation states', async ({ page }) => {
  await page.goto('/accueil'); await page.getByRole('button', { name: 'Créer l’étude' }).click();
  for (const step of [/^04 Prédimensionnement$/, /^05 Dimensionnement$/, /^06 Protections et câblerie$/, /^07 Évaluation financière$/, /^08 Vue synoptique et rapports$/]) {
    await page.getByRole('button', { name: step }).click();
    await expect(page.getByText('Cette capacité n’est pas encore disponible.')).toBeVisible();
    await expect(page.getByText(/Prévu dans (AIO-001|EQP-001|SAFE-001|FIN-001|DOC-001)/)).toBeVisible();
    await expect(page.locator('.state-panel.unavailable')).not.toContainText(/\b\d+(?:[.,]\d+)?\s*(?:kWh|Wh|FCFA|€|Wc|kW|Ah|V|A)\b/i);
  }
});
