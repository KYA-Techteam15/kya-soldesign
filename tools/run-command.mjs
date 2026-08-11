import { spawn } from 'node:child_process';

export function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}

export async function runSteps(steps) {
  for (const step of steps) {
    process.stdout.write(`\n[gate] ${step.label}\n`);
    const code = await runCommand(step.command, step.args);
    if (code !== 0) {
      process.stderr.write(`[gate] failed: ${step.label} (exit ${code})\n`);
      process.exit(code);
    }
  }
}

