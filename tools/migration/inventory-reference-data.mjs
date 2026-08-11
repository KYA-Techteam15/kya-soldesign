import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const inputs = [];
  let outputPath;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--input') {
      const value = argv[index + 1];
      if (!value) fail('--input requires <source-id>=<path>');
      const separator = value.indexOf('=');
      if (separator <= 0 || separator === value.length - 1) {
        fail('--input must use <source-id>=<path>');
      }
      inputs.push({ sourceId: value.slice(0, separator), path: value.slice(separator + 1) });
      index += 1;
      continue;
    }
    if (argument === '--out') {
      outputPath = argv[index + 1];
      if (!outputPath) fail('--out requires a path');
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${argument}`);
  }

  if (inputs.length === 0) fail('At least one --input is required');
  const ids = new Set();
  for (const input of inputs) {
    if (ids.has(input.sourceId)) fail(`Duplicate source id: ${input.sourceId}`);
    ids.add(input.sourceId);
  }

  return { inputs, outputPath };
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function isMissing(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function findArrays(value, path = '$', results = []) {
  if (Array.isArray(value)) {
    results.push({ path, values: value });
    return results;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value).sort(compareText)) {
      findArrays(value[key], `${path}.${key}`, results);
    }
  }
  return results;
}

function summarizeArray(path, values) {
  const objects = values.filter((value) => value && typeof value === 'object' && !Array.isArray(value));
  const fieldNames = [...new Set(objects.flatMap((value) => Object.keys(value)))].sort(compareText);
  const fields = Object.fromEntries(fieldNames.map((field) => [field, {
    present: objects.filter((value) => Object.hasOwn(value, field)).length,
    missing: objects.filter((value) => isMissing(value[field])).length,
    valueTypes: [...new Set(objects
      .filter((value) => Object.hasOwn(value, field) && !isMissing(value[field]))
      .map((value) => Array.isArray(value[field]) ? 'array' : typeof value[field]))].sort(compareText),
  }]));
  const idValues = objects
    .filter((value) => Object.hasOwn(value, 'id') && !isMissing(value.id))
    .map((value) => String(value.id));
  const duplicateIds = [...new Set(idValues.filter((id, index) => idValues.indexOf(id) !== index))]
    .sort(compareText);

  return {
    path,
    count: values.length,
    objectCount: objects.length,
    fields,
    duplicateIds,
  };
}

async function inspect(input) {
  const content = await readFile(resolve(input.path), 'utf8');
  const parsed = JSON.parse(content);
  return {
    sourceId: input.sourceId,
    sourceSha256: sha256(content),
    rootKind: Array.isArray(parsed) ? 'array' : typeof parsed,
    arrays: findArrays(parsed).map(({ path, values }) => summarizeArray(path, values)),
  };
}

const { inputs, outputPath } = parseArguments(process.argv.slice(2));
const sources = [];
for (const input of [...inputs].sort((left, right) => compareText(left.sourceId, right.sourceId))) {
  sources.push(await inspect(input));
}
const report = { schemaVersion: 1, sources };
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (outputPath) {
  await writeFile(resolve(outputPath), serialized, 'utf8');
}
process.stdout.write(serialized);
