import { expect, test } from '@playwright/test';

/** Spec 012, lot F : consentement à l'usage anonyme, avis et réponses. */

test('consent is asked once on the home page, then changeable in settings', async ({ page }) => {
  await page.goto('/accueil');
  const notice = page.locator('.usage-consent');
  await expect(notice).toContainText('Aider à améliorer KYA-SolDesign ?');
  await notice.getByRole('button', { name: 'Accepter' }).click();
  await expect(notice).toHaveCount(0);

  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  const section = page.locator('#avis');
  await expect(section.getByRole('radio', { name: 'Accepter' })).toHaveAttribute('aria-checked', 'true');
  await section.getByRole('radio', { name: 'Refuser' }).click();
  await expect(section.getByRole('radio', { name: 'Refuser' })).toHaveAttribute('aria-checked', 'true');
});

test('a message reaches the platform and its reply shows in settings', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  const section = page.locator('#avis');
  await section.getByRole('button', { name: 'Signaler un problème' }).click();

  const dialog = page.locator('.modal');
  await expect(dialog.getByRole('radio', { name: 'Problème' })).toHaveAttribute('aria-checked', 'true');
  await expect(dialog.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Message' }).fill('Le schéma ne s’affiche pas après un changement de batterie.');
  await dialog.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByText('Message envoyé')).toBeVisible();

  const thread = section.locator('.feedback-thread').first();
  await expect(thread).toContainText('Le schéma ne s’affiche pas');
  await expect(thread).toContainText('Reçu');
  await expect(thread.locator('.feedback-reply')).toContainText('bien été reçu');
});
