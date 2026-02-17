// © 2025 CyberLage
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { CosmosClient } = require('@azure/cosmos');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs(argv) {
  const args = { runId: null, latest: false, outDir: null };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--run-id') {
      args.runId = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--latest') {
      args.latest = true;
      continue;
    }
    if (token === '--out-dir') {
      args.outDir = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
  }

  return args;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toCsvCell(value) {
  if (value === null || value === undefined) return '';
  const stringValue = Array.isArray(value) ? value.join('; ') : String(value);
  const needsQuoting = /[",\r\n]/.test(stringValue);
  const escaped = stringValue.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function writeCsv(filePath, rows, headers) {
  const lines = [];
  lines.push(headers.map(h => toCsvCell(h)).join(','));
  for (const row of rows) {
    lines.push(headers.map(h => toCsvCell(row[h])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function writeJsonl(filePath, rows) {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  for (const row of rows) {
    stream.write(JSON.stringify(row) + '\n');
  }
  stream.end();
}

async function fetchAll(container, querySpec, options = {}) {
  const iterator = container.items.query(querySpec, options);
  const { resources } = await iterator.fetchAll();
  return resources;
}

function minIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxIso(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || (!args.runId && !args.latest)) {
    console.log('Export Cosmos DB data for a fetch run into CSV + JSONL files.');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/export-cosmos-run.js --latest');
    console.log('  node scripts/export-cosmos-run.js --run-id <RUN_ID>');
    console.log('  node scripts/export-cosmos-run.js --latest --out-dir <PATH>');
    console.log('');
    console.log('Required env vars:');
    console.log('  COSMOS_CONNECTION_STRING');
    console.log('Optional env vars:');
    console.log('  COSMOS_DATABASE (default: cyberradar)');
    process.exit(args.help ? 0 : 2);
  }

  const cosmosConnectionString = requireEnv('COSMOS_CONNECTION_STRING');
  const cosmosDatabase = process.env.COSMOS_DATABASE || 'cyberradar';

  const client = new CosmosClient(cosmosConnectionString);
  const database = client.database(cosmosDatabase);
  const logsContainer = database.container('fetch_logs');
  const alertsContainer = database.container('raw_alerts');

  let runId = args.runId;
  if (!runId) {
    const latestLogs = await fetchAll(logsContainer, {
      query: 'SELECT TOP 1 c.runId, c.startedAt FROM c ORDER BY c.startedAt DESC',
      parameters: [],
    });
    if (!latestLogs.length || !latestLogs[0].runId) {
      throw new Error('Could not determine latest runId from fetch_logs');
    }
    runId = latestLogs[0].runId;
  }

  const runLogs = await fetchAll(
    logsContainer,
    {
      query: 'SELECT * FROM c WHERE c.runId = @runId',
      parameters: [{ name: '@runId', value: runId }],
    },
    { partitionKey: runId }
  );

  if (!runLogs.length) {
    throw new Error(`No fetch_logs found for runId ${runId}`);
  }

  let runStart = null;
  let runEnd = null;
  for (const log of runLogs) {
    runStart = minIso(runStart, log.startedAt || null);
    runEnd = maxIso(runEnd, log.completedAt || null);
  }

  if (!runStart || !runEnd) {
    throw new Error(`Could not determine run window for runId ${runId}`);
  }

  const alerts = await fetchAll(alertsContainer, {
    query: 'SELECT * FROM c WHERE c.fetchedAt >= @start AND c.fetchedAt <= @end',
    parameters: [
      { name: '@start', value: runStart },
      { name: '@end', value: runEnd },
    ],
  });

  const defaultFolderName = `${new Date().toISOString().slice(0, 10)}_${runId}`;
  const outDir = path.resolve(args.outDir || path.join(__dirname, '..', 'data', 'exports', defaultFolderName));
  ensureDir(outDir);

  const manifest = {
    exportedAt: new Date().toISOString(),
    cosmosDatabase,
    runId,
    runWindow: { start: runStart, end: runEnd },
    counts: { fetchLogs: runLogs.length, rawAlerts: alerts.length },
    files: {
      fetchLogsCsv: 'fetch_logs.csv',
      fetchLogsJsonl: 'fetch_logs.jsonl',
      rawAlertsCsv: 'raw_alerts.csv',
      rawAlertsJsonl: 'raw_alerts.jsonl',
    },
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  writeJsonl(path.join(outDir, 'fetch_logs.jsonl'), runLogs);
  writeJsonl(path.join(outDir, 'raw_alerts.jsonl'), alerts);

  writeCsv(path.join(outDir, 'fetch_logs.csv'), runLogs, [
    'id',
    'runId',
    'sourceId',
    'startedAt',
    'completedAt',
    'durationMs',
    'status',
    'itemsFetched',
    'itemsNew',
    'itemsDuplicate',
    'itemsError',
    'error',
  ]);

  const alertRows = alerts.map(a => ({
    id: a.id,
    sourceId: a.sourceId,
    sourceName: a.sourceName,
    publishedAt: a.publishedAt,
    fetchedAt: a.fetchedAt,
    alertType: a.alertType,
    severity: a.severity,
    title: a.title,
    cveIds: (a.cveIds || []).join(';'),
    affectedVendors: (a.affectedVendors || []).join(';'),
    affectedProducts: (a.affectedProducts || []).join(';'),
    sourceUrl: a.sourceUrl,
  }));

  writeCsv(path.join(outDir, 'raw_alerts.csv'), alertRows, [
    'id',
    'sourceId',
    'sourceName',
    'publishedAt',
    'fetchedAt',
    'alertType',
    'severity',
    'title',
    'cveIds',
    'affectedVendors',
    'affectedProducts',
    'sourceUrl',
  ]);

  console.log(JSON.stringify({ ok: true, outDir, ...manifest.counts }, null, 2));
}

main().catch(error => {
  console.error(error?.stack || String(error));
  process.exit(1);
});


// © 2025 CyberLage

