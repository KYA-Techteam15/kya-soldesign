import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/desktop/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { toHaveScreenshot: { stylePath: './apps/desktop/e2e/screenshot.css' } },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /harness\.spec\.ts$/u,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Pages d'essai (pannes injectées) : servies par le seul serveur de
      // développement, jamais incluses dans la version livrée.
      name: 'harness',
      testMatch: /harness\.spec\.ts$/u,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  // Les parcours sont vérifiés sur la version construite, celle qui est livrée :
  // le serveur de développement compile chaque écran à la demande et fausse les délais.
  webServer: [
    {
      command: 'pnpm --filter @ksd/desktop build && pnpm --filter @ksd/desktop preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command: 'pnpm --filter @ksd/desktop dev --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174/catalog-error.html',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
