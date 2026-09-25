import { expect, test } from '@playwright/test';

/**
 * Écran « Imprimer les documents » : aperçu à gauche, composition à droite (spec 012, FR-A4).
 * Les pièces diffèrent réellement, et chaque réglage se voit aussitôt sur l'aperçu.
 */

async function openDocuments(page: import('@playwright/test').Page) {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.getByLabel('Nom du projet').fill('Centrale de Bouaké');
  await page.locator('.nav-item').nth(7).click();
  await page.getByRole('tab', { name: 'Imprimer les documents' }).click();
  await expect(page.locator('.a4').first()).toBeVisible();
}

test('le rapport et la proforma ne portent pas le même contenu', async ({ page }) => {
  await openDocuments(page);
  const report = page.locator('.paper-wrap');
  const panel = page.locator('.docs-panel');

  // Le rapport raconte le projet : gisement, hypothèses, méthode.
  await panel.getByRole('tab', { name: /Rapport technique/ }).click();
  await expect(report).toContainText('Site et gisement solaire');
  await expect(report).toContainText('Méthode et hypothèses');
  await expect(report).not.toContainText('Coûts d’achat et marges');

  // La proforma est une pièce comptable : pas de câbles, pas de planche.
  await panel.getByRole('tab', { name: 'Facture proforma' }).click();
  await expect(report).toContainText('Modalités de règlement');
  await expect(report).not.toContainText('Protections et câbles');
});

test('l’impression sort les feuilles de l’aperçu, et elles seules', async ({ page }) => {
  await openDocuments(page);
  const sheets = await page.locator('.a4-stack > article').count();
  const footer = page.locator('.a4-stack > article').last().locator('.a4-foot');
  await expect(footer).toContainText(`Page ${sheets} / ${sheets}`);
  await expect(footer).toContainText('version de travail');

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.a4-stack > article').first()).toBeVisible();
  await expect(page.locator('.docs-panel')).toBeHidden();
  await expect(page.locator('.topbar')).toBeHidden();
});

test('ne propose que les pièces prêtes à être remises', async ({ page }) => {
  await openDocuments(page);
  // L'offre interne et le dossier d'exécution restent construits et testés, mais ne sont pas proposés.
  const kinds = page.locator('.docs-kinds [role="tab"]');
  await expect(kinds).toHaveCount(2);
  await expect(page.locator('.docs-kinds')).not.toContainText('Offre technique interne');
  await expect(page.locator('.docs-kinds')).not.toContainText("Dossier d'exécution");
});

test('la couverture ouvre sur le logo puis le titre', async ({ page }) => {
  await openDocuments(page);
  const cover = page.locator('.a4-cover').first();
  await expect(cover.locator('.cover-mark img')).toBeVisible();
  await expect(cover.locator('.cover-title')).toHaveText('Centrale de Bouaké');
  // Les capitales viennent de la feuille de style : le nom saisi garde sa casse.
  await expect(cover.locator('.cover-title')).toHaveCSS('text-transform', 'uppercase');
  await expect(cover.locator('.cover-foot')).toContainText('©');
});

test('la composition se règle à côté de l’aperçu, qui suit aussitôt', async ({ page }) => {
  await openDocuments(page);
  const panel = page.locator('.docs-panel');
  await expect(page.locator('.paper-wrap')).toContainText('Site et gisement solaire');

  await panel.getByRole('checkbox', { name: 'Site et gisement solaire' }).uncheck();
  await expect(page.locator('.paper-wrap')).not.toContainText('Site et gisement solaire');

  // Sans les montants, le chiffrage disparaît mais la technique reste.
  await panel.locator('summary', { hasText: 'Options' }).click();
  await panel.getByRole('checkbox', { name: /Inclure les montants/ }).uncheck();
  await expect(page.locator('.paper-wrap')).not.toContainText('Chiffrage et prix de vente');
  await expect(page.locator('.paper-wrap')).toContainText('Système préconisé');
});

test('une section confidentielle n’est signalée que si elle est retenue', async ({ page }) => {
  await openDocuments(page);
  // Le rapport ne porte aucune section confidentielle : l'alerte est réservée aux pièces à marges.
  await expect(page.locator('.docs-panel')).not.toContainText('Elle n’est pas destinée au client');
});

test('les visuels viennent de la société, ou de ce dossier', async ({ page }) => {
  await openDocuments(page);
  const panel = page.locator('.docs-panel');
  await panel.locator('summary', { hasText: 'Visuels du document' }).click();
  await expect(panel.locator('.visual-choice')).toHaveCount(2);
  await expect(panel.locator('.visual-choice-logo img')).toBeVisible();
  await expect(panel.locator('.visual-choice-logo')).toContainText('Société');

  // Un logo propre au dossier remplace celui de la société, pour ce dossier seulement.
  await panel.getByLabel(/Remplacer pour ce dossier… · Fichier logo/).setInputFiles('apps/desktop/public/kya-sol-design-logo.png');
  await expect(panel.locator('.visual-choice-logo')).toContainText('Ce dossier');
  await panel.locator('.visual-choice-logo').getByRole('button', { name: 'Revenir à celui de la société' }).click();
  await expect(panel.locator('.visual-choice-logo')).toContainText('Société');
});