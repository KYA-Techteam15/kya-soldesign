import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  importLegacyLoadProfiles,
  importReferenceBatteries,
  importReferenceInverters,
  importReferenceLocalities,
  importReferencePvModules,
  importReferenceWeatherSources,
} from '../../packages/catalog/dist/index.js';

const transformationVersion = '1.0.0';

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const options = {};
  const expected = new Set(['modules', 'batteries', 'inverters', 'localities', 'weather-sources', 'profiles', 'out']);
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

async function readJson(path) {
  const content = await readFile(resolve(path), 'utf8');
  return { document: JSON.parse(content), sha256: sha256(content) };
}

function requireArray(document, label) {
  if (!Array.isArray(document)) fail(`${label} must contain a JSON array`);
  return document;
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJson(directory, filename, value) {
  const content = formatJson(value);
  await writeFile(resolve(directory, filename), content, 'utf8');
  return { filename, sha256: sha256(content) };
}

function datasetQuarantines(dataset, result) {
  return result.quarantined.map((record) => ({ dataset, ...record }));
}

function fieldCompleteness(records) {
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))].sort(compareText);
  return Object.fromEntries(fields.map((field) => [field, {
    present: records.filter((record) => Object.hasOwn(record, field)).length,
    known: records.filter((record) => record[field] !== null && record[field] !== undefined).length,
  }]));
}

const options = parseArguments(process.argv.slice(2));
const [modules, batteries, inverters, localities, weatherSources, profiles] = await Promise.all([
  readJson(options.modules),
  readJson(options.batteries),
  readJson(options.inverters),
  readJson(options.localities),
  readJson(options['weather-sources']),
  readJson(options.profiles),
]);
const context = { transformationVersion, sha256 };
const moduleResult = importReferencePvModules({
  sourceId: 'reference-modules', sourceSha256: modules.sha256, records: requireArray(modules.document, 'modules'),
}, context);
const batteryResult = importReferenceBatteries({
  sourceId: 'reference-batteries', sourceSha256: batteries.sha256, records: requireArray(batteries.document, 'batteries'),
}, context);
const inverterResult = importReferenceInverters({
  sourceId: 'reference-inverters', sourceSha256: inverters.sha256, records: requireArray(inverters.document, 'inverters'),
}, context);
const localityResult = importReferenceLocalities({
  sourceId: 'reference-localities', sourceSha256: localities.sha256, records: requireArray(localities.document, 'localities'),
}, context);
const weatherSourceResult = importReferenceWeatherSources({
  sourceId: 'reference-weather-sources', sourceSha256: weatherSources.sha256, records: requireArray(weatherSources.document, 'weather-sources'),
}, localityResult.canonicalIdBySourceRecordId, context);
const profileResult = importLegacyLoadProfiles({
  sourceId: 'legacy-profiles', sourceSha256: profiles.sha256, document: profiles.document,
}, context);

const outputDirectory = resolve(options.out);
await mkdir(outputDirectory, { recursive: true });
const equipment = [...moduleResult.accepted, ...batteryResult.accepted, ...inverterResult.accepted]
  .sort((left, right) => compareText(left.id, right.id));
const quarantined = [
  ...datasetQuarantines('pv-modules', moduleResult),
  ...datasetQuarantines('batteries', batteryResult),
  ...datasetQuarantines('inverters', inverterResult),
  ...datasetQuarantines('localities', localityResult),
  ...datasetQuarantines('weather-sources', weatherSourceResult),
  ...datasetQuarantines('load-profiles', profileResult),
].sort((left, right) => compareText(`${left.dataset}:${left.sourceRecordId}`, `${right.dataset}:${right.sourceRecordId}`));
const reports = {
  pvModules: moduleResult.report,
  batteries: batteryResult.report,
  inverters: inverterResult.report,
  localities: localityResult.report,
  weatherSources: weatherSourceResult.report,
  loadProfiles: profileResult.report,
};
const qualityReport = {
  schemaVersion: 1,
  transformationVersion,
  reports,
  totals: {
    inputRecords: Object.values(reports).reduce((total, report) => total + report.inputRecordCount, 0),
    acceptedRecords: Object.values(reports).reduce((total, report) => total + report.acceptedRecordCount, 0),
    quarantinedRecords: quarantined.length,
    warnings: Object.values(reports).reduce((total, report) => total + report.warningCount, 0),
    conflicts: Object.values(reports).reduce((total, report) => total + report.conflicts.length, 0),
  },
  completeness: {
    equipment: fieldCompleteness(equipment),
    localities: fieldCompleteness(localityResult.accepted),
    weatherSources: fieldCompleteness(weatherSourceResult.accepted),
    loadProfiles: fieldCompleteness(profileResult.accepted),
  },
};
const artifacts = await Promise.all([
  writeJson(outputDirectory, 'equipment.json', { schemaVersion: 1, records: equipment }),
  writeJson(outputDirectory, 'localities.json', { schemaVersion: 1, records: localityResult.accepted }),
  writeJson(outputDirectory, 'weather-sources.json', { schemaVersion: 1, records: weatherSourceResult.accepted }),
  writeJson(outputDirectory, 'load-profiles.json', { schemaVersion: 1, records: profileResult.accepted }),
  writeJson(outputDirectory, 'quarantine.json', { schemaVersion: 1, records: quarantined }),
  writeJson(outputDirectory, 'quality-report.json', qualityReport),
]);
const manifest = {
  schemaVersion: 1,
  transformationVersion,
  sources: Object.values(reports).map((report) => ({ sourceId: report.sourceId, sourceSha256: report.sourceSha256 }))
    .sort((left, right) => compareText(left.sourceId, right.sourceId)),
  artifacts: artifacts.sort((left, right) => compareText(left.filename, right.filename)),
};
await writeJson(outputDirectory, 'manifest.json', manifest);

process.stdout.write(`${formatJson({
  output: 'written',
  totals: qualityReport.totals,
  artifacts: [...artifacts.map((artifact) => artifact.filename), 'manifest.json'].sort(compareText),
})}`);
