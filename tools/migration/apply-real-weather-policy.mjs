import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dataDirectory = resolve(repositoryRoot, 'packages/catalog/data');
const transformationVersion = '1.1.0';

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function readJson(relativePath) {
  const content = await readFile(resolve(dataDirectory, relativePath), 'utf8');
  return { content, value: JSON.parse(content) };
}

async function writeJson(relativePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(resolve(dataDirectory, relativePath), content, 'utf8');
  return { filename: relativePath.replaceAll('\\', '/'), sha256: sha256(content) };
}

function fieldCompleteness(records) {
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))].sort((left, right) => left.localeCompare(right));
  return Object.fromEntries(fields.map((field) => [field, {
    present: records.filter((record) => Object.hasOwn(record, field)).length,
    known: records.filter((record) => record[field] !== null && record[field] !== undefined).length,
  }]));
}

const [fileManifest, weatherSnapshot, localitySnapshot, qualitySnapshot, manifestSnapshot] = await Promise.all([
  readJson('weather-files.json'),
  readJson('weather-sources.json'),
  readJson('localities.json'),
  readJson('quality-report.json'),
  readJson('manifest.json'),
]);

const acceptedIds = new Set(fileManifest.value.records.map((record) => record.weatherSourceId));
const fileBySourceId = new Map(fileManifest.value.records.map((record) => [record.weatherSourceId, record]));
const weatherSources = weatherSnapshot.value.records
  .filter((record) => acceptedIds.has(record.id))
  .map((record) => {
    const file = fileBySourceId.get(record.id);
    return {
      ...record,
      provenance: {
        sourceId: file.id,
        sourceRecordId: file.relativePath,
        sourceSha256: file.sourceSha256,
        transformationVersion,
      },
    };
  });
if (weatherSources.length !== fileManifest.value.records.length) {
  throw new Error('Every weather file must resolve to one canonical weather source');
}

const localities = localitySnapshot.value.records.map((record) => {
  const file = fileManifest.value.records.find((candidate) => candidate.localityId === record.id);
  return file === undefined ? record : {
    ...record,
    elevationM: record.elevationM,
    timezone: file.timezoneIana,
    provenance: { ...record.provenance, transformationVersion },
  };
});

const weatherFile = fileManifest.value.records[0];
const reports = {
  ...qualitySnapshot.value.reports,
  weatherSources: {
    sourceId: weatherFile.id,
    sourceSha256: weatherFile.sourceSha256,
    inputRecordCount: fileManifest.value.records.length,
    acceptedRecordCount: weatherSources.length,
    quarantinedRecordCount: 0,
    warningCount: 0,
    duplicateCanonicalIds: [],
    duplicateCanonicalIdentities: [],
    conflicts: [],
    transformations: ['pvgis-tmy-json-v1', 'weather-file-policy-v1'],
  },
};
const totals = {
  inputRecords: Object.values(reports).reduce((sum, report) => sum + report.inputRecordCount, 0),
  acceptedRecords: Object.values(reports).reduce((sum, report) => sum + report.acceptedRecordCount, 0),
  quarantinedRecords: Object.values(reports).reduce((sum, report) => sum + report.quarantinedRecordCount, 0),
  warnings: Object.values(reports).reduce((sum, report) => sum + report.warningCount, 0),
  conflicts: Object.values(reports).reduce((sum, report) => sum + report.conflicts.length, 0),
};
const qualityReport = {
  ...qualitySnapshot.value,
  transformationVersion,
  reports,
  totals,
  completeness: {
    ...qualitySnapshot.value.completeness,
    localities: fieldCompleteness(localities),
    weatherSources: fieldCompleteness(weatherSources),
  },
};

const artifacts = await Promise.all([
  writeJson('weather-sources.json', { schemaVersion: 1, records: weatherSources }),
  writeJson('localities.json', { schemaVersion: 1, records: localities }),
  writeJson('quality-report.json', qualityReport),
]);
const unchangedArtifacts = manifestSnapshot.value.artifacts.filter((artifact) =>
  !new Set(['weather-sources.json', 'localities.json', 'quality-report.json', 'weather-files.json', weatherFile.relativePath]).has(artifact.filename));
const traceableArtifacts = [
  { filename: 'weather-files.json', sha256: sha256(fileManifest.content) },
  { filename: weatherFile.relativePath, sha256: weatherFile.sourceSha256 },
];
const sources = [
  ...manifestSnapshot.value.sources.filter((source) => source.sourceId !== 'reference-weather-sources' && source.sourceId !== weatherFile.id),
  { sourceId: weatherFile.id, sourceSha256: weatherFile.sourceSha256 },
].sort((left, right) => left.sourceId.localeCompare(right.sourceId));
await writeJson('manifest.json', {
  ...manifestSnapshot.value,
  transformationVersion,
  sources,
  artifacts: [...unchangedArtifacts, ...artifacts, ...traceableArtifacts]
    .sort((left, right) => left.filename.localeCompare(right.filename)),
});

process.stdout.write(`${JSON.stringify({ weatherSources: weatherSources.length, weatherFiles: fileManifest.value.records.length, totals })}\n`);
