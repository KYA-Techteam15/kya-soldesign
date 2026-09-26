import { defineConfig, devices } from '@playwright/test';
import { TEST_PLATFORM_URL, TEST_PUBLIC_KEY } from './apps/desktop/e2e/support/licence';

// Licences (T061) : la version des parcours vise une plateforme fictive et vérifie avec la clé de test ;
// chaque parcours démarre sur un poste déjà licencié (e2e/support/global-setup.ts).
const platformEnv = { ...process.env, VITE_PLATFORM_URL: TEST_PLATFORM_URL, VITE_LICENSE_PUBLIC_KEY: TEST_PUBLIC_KEY };

export default defineConfig({
  testDir: './apps/desktop/e2e',
  globalSetup: './apps/desktop/e2e/support/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { toHaveScreenshot: { stylePath: './apps/desktop/e2e/screenshot.css' } },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    storageState: 'test-results/.auth/licence.json',
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
      env: platformEnv,
    },
    {
      command: 'pnpm --filter @ksd/desktop dev --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174/catalog-error.html',
      reuseExistingServer: !process.env.CI,
      env: platformEnv,
    },
  ],
});
