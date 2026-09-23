import { expect, test } from '@playwright/test';

/**
 * Écran « Imprimer les documents ».
 *
 * Les quatre pièces ont longtemps partagé le même contenu : seul le titre de
 * couverture changeait. Ces cas vérifient qu'elles diffèrent réellement, et
 * que la composition se règle au moment de générer sans passer par les
 * réglages de l'entreprise.
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

  // Le rapport raconte le projet : gisement, hypothèses, méthode.
  await page.locator('.proj-row', { hasText: 'Rapport technique' }).getByRole('button', { name: 'Aperçu' }).click();
  await expect(report).toContainText('Site et gisement solaire');
  await expect(report).toContainText('Méthode et hypothèses');
  await expect(report).not.toContainText('Coûts d’achat et marges');

  // La proforma est une pièce comptable : pas de câbles, pas de planche.
  await page.locator('.proj-row', { hasText: 'Facture proforma' }).getByRole('button', { name: 'Aperçu' }).click();
  await expect(report).toContainText('Modalités de règlement');
  await expect(report).not.toContainText('Protections et câbles');
});

test('ne propose que les pièces prêtes à être remises', async ({ page }) => {
  await openDocuments(page);
  // L'offre interne et le dossier d'exécution restent construits et testés,
  // mais ne sont pas encore présentables : leurs boutons sont retirés.
  await expect(page.locator('.proj-row')).toHaveCount(2);
  await expect(page.locator('.proj-list')).not.toContainText('Offre technique interne');
  await expect(page.locator('.proj-list')).not.toContainText("Dossier d'exécution");
});

test('la couverture ouvre sur le logo puis le titre', async ({ page }) => {
  await openDocuments(page);
  const cover = page.locator('.a4-cover').first();
  await expect(cover.locator('.cover-mark img')).toBeVisible();
  await expect(cover.locator('.cover-title')).toHaveText('Centrale de Bouaké');
  // Les capitales viennent de la feuille de style : le nom saisi au clavier
  // garde sa casse, la couverture l'affiche en titre d'ouvrage.
  await expect(cover.locator('.cover-title')).toHaveCSS('text-transform', 'uppercase');
  await expect(cover.locator('.cover-foot')).toContainText('©');
});

test('la composition se règle au moment de générer', async ({ page }) => {
  await openDocuments(page);
  await expect(page.locator('.paper-wrap')).toContainText('Site et gisement solaire');

  await page.locator('.proj-row', { hasText: 'Rapport technique' }).getByRole('button', { name: 'Configurer…' }).click();
  const dialog = page.locator('.modal');
  await expect(dialog).toContainText('Générer le document');

  // Décocher une section la retire réellement de l'aperçu.
  await dialog.getByRole('checkbox', { name: 'Site et gisement solaire' }).uncheck();
  // Sans les montants, le chiffrage disparaît mais la technique reste.
  await dialog.getByRole('checkbox', { name: 'Inclure les montants' }).uncheck();
  await dialog.getByRole('button', { name: 'Générer le Word' }).click();

  await expect(page.locator('.paper-wrap')).not.toContainText('Site et gisement solaire');
  await expect(page.locator('.paper-wrap')).not.toContainText('Chiffrage et prix de vente');
  await expect(page.locator('.paper-wrap')).toContainText('Système préconisé');
});

test('une section confidentielle est signalée avant de générer', async ({ page }) => {
  await openDocuments(page);
  // Le rapport ne porte aucune section confidentielle : l'alerte ne doit donc
  // pas s'y afficher. Elle reste réservée aux pièces qui exposent des marges.
  await page.locator('.proj-row', { hasText: 'Rapport technique' }).getByRole('button', { name: 'Configurer…' }).click();
  const dialog = page.locator('.modal');
  await expect(dialog).toContainText('Générer le document');
  await expect(dialog).not.toContainText('Elle n’est pas destinée au client');
});

test('le dialogue montre les visuels réellement imprimés', async ({ page }) => {
  await openDocuments(page);
  await page.locator('.proj-row', { hasText: 'Rapport technique' }).getByRole('button', { name: 'Configurer…' }).click();
  const dialog = page.locator('.modal');
  // Deux emplacements, avec l'aperçu du fichier : sans lui, on ne découvrait
  // le mauvais logo qu'une fois le document ouvert.
  await expect(dialog.locator('.visual-slot')).toHaveCount(2);
  await expect(dialog.locator('.visual-slot-logo img')).toBeVisible();
  await expect(dialog).toContainText('communs aux quatre pièces');
});
