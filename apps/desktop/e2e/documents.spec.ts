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

test('les quatre pièces ne portent pas le même contenu', async ({ page }) => {
  await openDocuments(page);

  // Le rapport raconte le projet : gisement, hypothèses, méthode.
  await page.getByRole('button', { name: 'Aperçu' }).first().click();
  const report = page.locator('.paper-wrap');
  await expect(report).toContainText('Site et gisement solaire');
  await expect(report).toContainText('Méthode et hypothèses');
  await expect(report).not.toContainText('Coûts d’achat et marges');

  // L'offre interne est la seule à montrer les coûts d'achat et les marges.
  await page.locator('.proj-row', { hasText: 'Offre technique interne' }).getByRole('button', { name: 'Aperçu' }).click();
  await expect(report).toContainText('Coûts d’achat et marges');

  // La proforma est une pièce comptable : pas de câbles, pas de planche.
  await page.locator('.proj-row', { hasText: 'Facture proforma' }).getByRole('button', { name: 'Aperçu' }).click();
  await expect(report).toContainText('Modalités de règlement');
  await expect(report).not.toContainText('Protections et câbles');

  // Le dossier d'exécution porte la fiche de mise en service.
  await page.locator('.proj-row', { hasText: "Dossier d'exécution" }).getByRole('button', { name: 'Aperçu' }).click();
  await expect(report).toContainText('Mise en service et réception');
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
  await page.locator('.proj-row', { hasText: 'Offre technique interne' }).getByRole('button', { name: 'Configurer…' }).click();
  const dialog = page.locator('.modal');
  await expect(dialog).toContainText('Elle n’est pas destinée au client');

  // Retirée, l'alerte disparaît : elle décrit ce que la pièce porte vraiment.
  await dialog.getByRole('checkbox', { name: 'Coûts d’achat et marges (confidentiel)' }).uncheck();
  await expect(dialog).not.toContainText('Elle n’est pas destinée au client');
});
