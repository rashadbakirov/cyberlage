// © 2025 CyberLage
/**
 * Prompt Lab — Sample V2 Alerts
 *
 * Returns a random sample of alerts that were already enriched with v2 (`enrichmentVersion=2`).
 * Intended for prompt iteration/evaluation in Azure AI Foundry without touching production data.
 *
 * GET/POST /api/promptlab/sample?limit=50&seed=123
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING!;
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || 'cyberradar';

const cosmosClient = new CosmosClient(COSMOS_CONNECTION_STRING);
const database = cosmosClient.database(COSMOS_DATABASE);
const alertsContainer = database.container('raw_alerts');

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function toSeed(value: string | null): number {
  if (!value) return Math.floor(Math.random() * 0xffffffff);
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed)) return parsed >>> 0;

  // Simple hash for non-numeric seeds
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  // xorshift32
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

function sampleArray<T>(items: T[], n: number, seed: number): T[] {
  if (n >= items.length) return items.slice();
  const rng = makeRng(seed);
  const out: T[] = [];
  const used = new Set<number>();

  while (out.length < n) {
    const idx = Math.floor(rng() * items.length);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(items[idx]);
  }

  return out;
}

function countBy<T>(items: T[], keyFn: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = keyFn(item) || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

async function promptLabSampleHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const limitParam = request.query.get('limit');
  const seedParam = request.query.get('seed');
  const poolParam = request.query.get('pool');

  const requestedLimit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  const limit = clampInt(requestedLimit, 1, 200);

  const requestedPool = poolParam ? Number.parseInt(poolParam, 10) : 500;
  const poolLimit = clampInt(requestedPool, limit, 2000);

  const seed = toSeed(seedParam);

  context.log('PromptLab sample requested', { limit, poolLimit, seed });

  // Get a pool of recent v2-enriched alerts
  const query = {
    query:
      'SELECT * FROM c WHERE c.enrichmentVersion = 2 ORDER BY c.fetchedAt DESC OFFSET 0 LIMIT @limit',
    parameters: [{ name: '@limit', value: poolLimit }],
  };

  const { resources } = await alertsContainer.items.query<any>(query, { maxItemCount: poolLimit }).fetchAll();

  const sample = sampleArray(resources, limit, seed);

  const severityCounts = countBy(sample, a => String(a?.severity || 'unknown').toLowerCase());
  const typeCounts = countBy(sample, a => String(a?.alertType || 'other').toLowerCase());
  const sourceCounts = countBy(sample, a => String(a?.sourceId || 'unknown'));

  const withCve = sample.filter(a => Array.isArray(a.cveIds) && a.cveIds.length > 0).length;
  const withCvss = sample.filter(a => a.cvssScore !== null && a.cvssScore !== undefined).length;
  const withEpss = sample.filter(a => a.epssScore !== null && a.epssScore !== undefined).length;
  const doraYes = sample.filter(a => a?.compliance?.dora?.relevant === 'yes').length;
  const gdprNonNull = sample.filter(a => a?.compliance?.gdpr !== null && a?.compliance?.gdpr !== undefined).length;

  return {
    status: 200,
    jsonBody: {
      ok: true,
      metadata: {
        limit,
        poolLimit,
        seed,
        exportedAt: new Date().toISOString(),
        cosmosDatabase: COSMOS_DATABASE,
        cosmosContainer: 'raw_alerts',
      },
      stats: {
        withCve,
        withCvss,
        withEpss,
        doraYes,
        gdprNonNull,
        severityCounts,
        typeCounts,
        sourceCounts,
      },
      alerts: sample,
    },
  };
}

app.http('PromptLabSampleV2', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'promptlab/sample',
  handler: promptLabSampleHandler,
});



