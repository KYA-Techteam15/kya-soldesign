import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { importReferencePvModules } from '../../packages/catalog/dist/index.js';

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const options = {};
  const expected = new Set(['modules', 'out']);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) fail(`Unknown argument: ${argument}`);
    const key = argument.slice(2);
    if (!expected.has(key)) fail(`Unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail(`${argument} requires a path`);
    if (options[key] !== undefined) fail(`${argument} was provided more than once`);
    options[key] = value;
    index += 1;
  }
  for (const key of expected) {
    if (options[key] === undefined) fail(`--${key} is required`);
  }
  return options;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const options = parseArguments(process.argv.slice(2));
const sourceContent = await readFile(resolve(options.modules), 'utf8');
const sourceRecords = JSON.parse(sourceContent);
if (!Array.isArray(sourceRecords) || sourceRecords.length === 0) {
  fail('--modules must contain a non-empty JSON array');
}

const records = Array.from({ length: 1_000 }, (_, index) => ({
  ...sourceRecords[index % sourceRecords.length],
  id: `benchmark-${index}`,
}));
const context = { transformationVersion: '1.0.0', sha256 };
const source = {
  sourceId: 'benchmark-reference-modules',
  sourceSha256: sha256(sourceContent),
  records,
};

importReferencePvModules(source, context);
const startedAt = process.hrtime.bigint();
const result = importReferencePvModules(source, context);
const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
const benchmark = {
  schemaVersion: 1,
  method: 'one warm-up import followed by one measured deterministic import of 1,000 cloned source records',
  records: records.length,
  durationMs,
  acceptedRecords: result.accepted.length,
  quarantinedRecords: result.quarantined.length,
  requirement: 'NFR-DATA-001: below 2,000 ms after warm-up',
  passed: durationMs < 2_000,
};
await writeFile(resolve(options.out), `${JSON.stringify(benchmark, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(benchmark)}\n`);
if (!benchmark.passed) process.exitCode = 1;
