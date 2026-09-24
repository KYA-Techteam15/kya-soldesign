import { expect, test, type Page } from '@playwright/test';

/**
 * Parcours complet de la version 1.0 (specs/010-release-readiness, T042) :
 * création → météo → besoins → prédimensionnement → matériel → protections →
 * chiffrage → dossier → Word, puis cohérence après modification.
 */

const WEATHER_FILE = 'packages/catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json';
const step = (page: Page, index: number) => page.locator('.nav-item').nth(index).click();

async function buildProject(page: Page) {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Nouveau projet', exact: true }).click();
  await page.getByLabel('Nom du projet').fill('Centre de santé Bombouaka');
  await page.getByLabel('Numéro de dossier').fill('KSD-2026-001');
  await page.getByLabel('Nom du client').fill('District sanitaire');
  await page.getByLabel('Localisation du site').fill('Bombouaka, Togo');
  await page.getByLabel('Chargé de projet').fill('A. Ingénieur');

  await step(page, 1);
  await page.getByRole('button', { name: /Télécharger les données d’irradiance/ }).click();
  await page.getByRole('button', { name: 'Depuis un fichier' }).click();
  await page.getByLabel('Nom du site').fill('Bombouaka');
  await page.getByLabel('Pays').selectOption('TG');
  await page.getByLabel('Fuseau horaire IANA').fill('Africa/Lome');
  await page.locator('.modal input[type="file"]').setInputFiles(WEATHER_FILE);
  await page.getByRole('button', { name: 'Enregistrer dans le dossier', exact: true }).last().click();
  await expect(page.locator('.pickfield')).toContainText('Bombouaka');
  // La température minimale vient de la série météo, pas d'une valeur fixe.
  await expect(page.getByLabel('Température minimale')).toHaveAttribute('placeholder', /^-?\d+$/u);

  await step(page, 2);
  await page.getByRole('button', { name: '+ Ajouter une ligne', exact: true }).first().click();
  const classic = page.locator('.t-classic');
  await classic.getByLabel('Quantité').first().fill('10');
  await classic.getByLabel('Puissance unitaire').first().fill('150');
  await classic.getByLabel("Heures d'usage").first().fill('8');
  await page.keyboard.press('Tab');

  await step(page, 3);
  await page.getByRole('button', { name: 'Lancer le prédimensionnement' }).click();
  await expect(page.getByRole('button', { name: 'Lancer le prédimensionnement' })).toBeEnabled({ timeout: 60_000 });

  await step(page, 4);
  await page.getByRole('button', { name: 'Choisir…' }).first().click();
  await page.locator('.pick-row').first().click();
  await page.getByRole('button', { name: 'Choisir…' }).first().click();
  await page.locator('.pick-row').first().click();
  await page.locator('.candlist button').first().click();
  await expect(page.locator('.runbar')).toContainText('Dimensionnement à jour', { timeout: 30_000 });

  await step(page, 5);
  const segments = [['PV → Onduleur', 'Fusible gPV'], ['Onduleur → Batterie', 'Disjoncteur DC'], ['Onduleur → Charges', 'Disjoncteur AC']] as const;
  for (const [segment] of segments) {
    await page.getByLabel(`Longueur · ${segment}`).fill('5');
    await page.keyboard.press('Tab');
  }
  // Sans aucun choix, le type recommandé et le calibre suggéré sont retenus : tout est conforme.
  await expect(page.locator('.t-prot .badge.ok')).toHaveCount(3);
  await expect(page.locator('.t-cables .badge.ok')).toHaveCount(3);
  for (const row of await page.locator('.t-cables tbody tr').all()) await expect(row.locator('td').nth(7)).toHaveText(/^\d+(?:,\d+)?$/u);
  // Un choix explicite remplace la suggestion.
  const [segment, type] = segments[0];
  await page.getByLabel(`Type retenu · ${segment}`).selectOption(type);
  await page.getByLabel(`Calibre retenu · ${segment}`).selectOption({ index: 2 });
  await expect(page.locator('.t-prot .badge.ok')).toHaveCount(3);
  await expect(page.locator('.t-cables .badge.ok')).toHaveCount(3);
}

test('produces a coherent client file from creation to Word', async ({ page }) => {
  test.setTimeout(180_000);
  await buildProject(page);

  await step(page, 6);
  const costing = page.locator('.finance-summary');
  await expect(costing.locator('.out-cell').first()).not.toHaveClass(/is-pending/u, { timeout: 30_000 });
  const retainedSri = (await page.locator('.finance-compare-table tr', { hasText: 'SRI' }).locator('td').nth(2).innerText()).trim();

  await step(page, 7);
  await expect(page.locator('.sheet .kpis')).toContainText('Validé');
  // Le bilan financier arrive après le dimensionnement : attendre la valeur, pas la lire une fois.
  await expect(page.locator('.sheet .out-cell', { hasText: 'SRI' }).locator('.out-val')).toHaveText(retainedSri, { timeout: 30_000 });

  // Le bouton de la barre d'avancement mène à l'impression (le repère « suite plus bas » ne le masque plus).
  await page.locator('.stepnext .btn-primary').click({ timeout: 5_000 });
  await expect(page.getByRole('tab', { name: 'Imprimer les documents' })).toHaveAttribute('aria-selected', 'true');
  const paper = page.locator('.paper-wrap');
  await expect(paper).toContainText('Édité le');
  await expect(paper).not.toContainText('Édité le —');
  await expect(paper).toContainText('A. Ingénieur');
  await expect(paper).not.toContainText('residential');

  const download = page.waitForEvent('download');
  await page.locator('.proj-row', { hasText: 'Rapport technique' }).getByRole('button', { name: /Word/u }).click();
  const proceed = page.locator('.modal').getByRole('button', { name: 'Imprimer malgré les avertissements' });
  if (await proceed.isVisible({ timeout: 2_000 }).catch(() => false)) await proceed.click();
  expect((await download).suggestedFilename()).toMatch(/^centre-de-sante-bombouaka-rapport\.docx$/u);
});

test('blocks client documents as soon as the sizing is stale', async ({ page }) => {
  test.setTimeout(180_000);
  await buildProject(page);

  await step(page, 2);
  await page.locator('.t-classic').getByLabel('Quantité').first().fill('30');
  await page.keyboard.press('Tab');

  await step(page, 7);
  await expect(page.locator('.sheet .kpis')).toContainText('résultat périmé');
  await page.getByRole('tab', { name: 'Imprimer les documents' }).click();
  await page.locator('.proj-row', { hasText: 'Rapport technique' }).getByRole('button', { name: /Word/u }).click();
  await expect(page.locator('.toast.error')).toContainText('Impression bloquée');
  await expect(page.locator('.document-readiness')).toContainText('périmé');
});

test('leaves no French copy on the English workshop screens', async ({ page }) => {
  test.setTimeout(180_000);
  await buildProject(page);
  await page.locator('.topbar .lang-toggle').click();
  for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
    await step(page, index);
    await expect(page.locator('.stephead')).toContainText(`${index + 1} / 8`);
    const text = await page.locator('.sheet').innerText();
    // Mots français fréquents de l'interface ; les données saisies (noms) ne les contiennent pas.
    expect(text).not.toMatch(/\b(?:Onduleurs|Dimensionnement|Chiffrage|Protections et câbles|étape|requis|Validé|Système retenu|Poursuivre|lignes|Ajouter|Crête|cumul|Puissance|Positionnez|informations)\b/u);
  }
});
