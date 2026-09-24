import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/desktop/test/**/*.test.ts', 'apps/desktop/test/**/*.test.tsx'],
    // Les tests d'intégration simulent des années de 8 760 heures ; lancés en
    // parallèle sur un poste chargé, 5 s par défaut ne mesurait que la charge.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 80,
      },
    },
  },
});
