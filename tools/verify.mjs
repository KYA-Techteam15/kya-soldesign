import { runSteps } from './run-command.mjs';

await runSteps([
  { label: 'phase gate', command: 'pnpm', args: ['verify:phase'] },
  { label: 'golden tests', command: 'pnpm', args: ['test:golden'] },
  { label: 'integration tests', command: 'pnpm', args: ['test:integration'] },
  { label: 'coverage', command: 'pnpm', args: ['test:coverage'] },
  { label: 'production build', command: 'pnpm', args: ['build'] },
  { label: 'browser acceptance', command: 'pnpm', args: ['test:e2e'] },
]);

process.stdout.write('\n[gate] repository verified\n');
