import { runSteps } from './run-command.mjs';

await runSteps([
  { label: 'lint', command: 'pnpm', args: ['lint'] },
  { label: 'typecheck', command: 'pnpm', args: ['typecheck'] },
  { label: 'UI source contracts', command: 'pnpm', args: ['check:ui'] },
  { label: 'unit tests', command: 'pnpm', args: ['test:unit'] },
  { label: 'property tests', command: 'pnpm', args: ['test:property'] },
  { label: 'data quality', command: 'pnpm', args: ['test:data'] },
]);

process.stdout.write('\n[gate] phase verified\n');
