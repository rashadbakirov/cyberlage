// © 2025 CyberLage
/**
 * Fetch-Orchestrator
 * Koordiniert das Laden aller Quellen, Deduplizierung und Speicherung.
 */

import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { CyberRadarAlert, PartialAlert, FetchLog, SourceRegistryEntry, SourceCategory } from './types/schema';
import { computeContentHash } from './utils/content-hash';
import { fetchCISAKEV } from './parsers/cisa-kev';
import { fetchBSICERT } from './parsers/bsi-cert';
import { fetchMicrosoftMSRC } from './parsers/microsoft-msrc';
import { fetchM365MessageCenter, fetchM365Roadmap, fetchM365ServiceHealth } from './parsers/microsoft-m365';
import { fetchGenericRSS, RSSSourceConfig } from './parsers/generic-rss';
import { fetchSiemensProductCERT } from './parsers/siemens-productcert';
import { fetchNvdCvssByCveIds } from './parsers/nist-nvd';
import { cvssToSeverity } from './utils/extractors';
import { RawCacheItem, SourceFetchResult } from './types/fetch-result';

// Environment variables
const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING!;
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || 'cyberradar';
const BLOB_CONNECTION_STRING = process.env.BLOB_CONNECTION_STRING!;
const NVD_API_KEY = process.env.NVD_API_KEY || null;
const NVD_RATE_LIMIT_SECONDS = parseOptionalInt(process.env.NVD_RATE_LIMIT_SECONDS) ?? (NVD_API_KEY ? 1 : 7);
const NVD_MAX_REQUESTS = parseOptionalInt(process.env.NVD_MAX_REQUESTS) ?? (NVD_API_KEY ? 50 : 15);
// Tenant-spezifische Quellen sind in der Public-Version standardmäßig deaktiviert.
const ENABLE_TENANT_SOURCES = process.env.ENABLE_TENANT_SOURCES === 'true';

// Initialize clients
const cosmosClient = new CosmosClient(COSMOS_CONNECTION_STRING);
const database = cosmosClient.database(COSMOS_DATABASE);
const alertsContainer = database.container('raw_alerts');
const logsContainer = database.container('fetch_logs');
const sourceRegistryContainer = database.container('source_registry');
const blobServiceClient = BlobServiceClient.fromConnectionString(BLOB_CONNECTION_STRING);
const sourceCacheContainer = blobServiceClient.getContainerClient('source-cache');
const snapshotsContainer = blobServiceClient.getContainerClient('fetch-snapshots');

// RSS Source configurations
const RSS_SOURCES: RSSSourceConfig[] = [
  {
    sourceId: 'cisa-advisories',
    sourceName: 'CISA Cybersecurity Advisories',
    sourceCategory: 'government',
    trustTier: 1,
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    language: 'en',
    excludeLinkSubstrings: ['/news-events/ics-advisories/'],
  },
  {
    sourceId: 'cisa-ics',
    sourceName: 'CISA Industrial Control Systems Advisories',
    sourceCategory: 'government',
    trustTier: 1,
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    language: 'en',
    defaultAlertType: 'advisory',
    defaultAlertSubType: 'ics-ot',
    includeLinkSubstrings: ['/news-events/ics-advisories/'],
  },
  {
    sourceId: 'hackernews',
    sourceName: 'The Hacker News',
    sourceCategory: 'news',
    trustTier: 2,
    url: 'https://feeds.feedburner.com/TheHackersNews',
    language: 'en',
  },
  {
    sourceId: 'bleepingcomputer',
    sourceName: 'BleepingComputer Security',
    sourceCategory: 'news',
    trustTier: 2,
    url: 'https://www.bleepingcomputer.com/feed/',
    language: 'en',
    includeTitleKeywords: [
      'vulnerability',
      'exploit',
      'ransomware',
      'malware',
      'breach',
      'zero-day',
      'cve',
      'cisa',
      'microsoft',
      'patch',
      'hacker',
      'attack',
      'backdoor',
    ],
  },
  {
    sourceId: 'heise-security',
    sourceName: 'heise Security',
    sourceCategory: 'news',
    trustTier: 2,
    url: 'https://www.heise.de/security/rss/alert-news-atom.xml',
    language: 'de',
  },
  {
    sourceId: 'fortinet-psirt',
    sourceName: 'Fortinet Product Security Incident Response Team',
    sourceCategory: 'vendor',
    trustTier: 1,
    url: 'https://www.fortiguard.com/rss/ir.xml',
    language: 'en',
    defaultAlertType: 'advisory',
  },
  {
    sourceId: 'cisco-security',
    sourceName: 'Cisco Security Advisories',
    sourceCategory: 'vendor',
    trustTier: 1,
    url: 'https://tools.cisco.com/security/center/psirtrss20/CiscoSecurityAdvisory.xml',
    language: 'en',
    defaultAlertType: 'advisory',
    includeTitleKeywords: ['Critical', 'High'],
  },
];

interface FetchSource {
  sourceId: string;
  sourceName: string;
  sourceCategory: SourceCategory;
  trustTier: 1 | 2 | 3;
  defaultFetchIntervalSeconds: number;
  fetchConfig: {
    type: SourceRegistryEntry['fetchConfig']['type'];
    url: string;
    backupUrl: string | null;
    rateLimitSeconds: number;
    timeoutSeconds: number;
    headers: Record<string, string>;
    parser: string;
  };
  fetcher: () => Promise<SourceFetchResult>;
}

/**
 * Main orchestrator function
 */
export async function runFetchCycle(): Promise<{
  runId: string;
  totalFetched: number;
  totalNew: number;
  totalDuplicate: number;
  totalErrors: number;
}> {
  const runId = uuidv4();
  const startTime = new Date();
  const now = new Date();
  const sourceSummaries: Array<{
    sourceId: string;
    sourceName: string;
    status: FetchLog['status'];
    startedAt: string;
    completedAt: string;
    durationMs: number;
    itemsFetched: number;
    itemsNew: number;
    itemsDuplicate: number;
    itemsError: number;
    rawBlobPath: string | null;
    error: string | null;
  }> = [];

  console.log(`[${runId}] Starting fetch cycle at ${startTime.toISOString()}`);

  let totalFetched = 0;
  let totalNew = 0;
  let totalDuplicate = 0;
  let totalErrors = 0;

  let blobCachingAvailable = true;
  try {
    await ensureBlobContainersExist();
  } catch (error: any) {
    blobCachingAvailable = false;
    console.warn(`[${runId}] Blob containers could not be verified/created. Raw caching disabled for this run: ${error?.message ?? String(error)}`);
  }

  // Fetch from all sources
  const sources: FetchSource[] = [
    {
      sourceId: 'cisa-kev',
      sourceName: 'CISA Known Exploited Vulnerabilities (KEV)',
      sourceCategory: 'government',
      trustTier: 1,
      defaultFetchIntervalSeconds: 24 * 60 * 60,
      fetchConfig: {
        type: 'json-feed',
        url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
        backupUrl: null,
        rateLimitSeconds: 60,
        timeoutSeconds: 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchCISAKEV',
      },
      fetcher: fetchCISAKEV,
    },
    {
      sourceId: 'bsi-cert',
      sourceName: 'BSI CERT-Bund (WID) Sicherheitshinweise',
      sourceCategory: 'government',
      trustTier: 1,
      defaultFetchIntervalSeconds: 6 * 60 * 60,
      fetchConfig: {
        type: 'api',
        url: 'https://wid.cert-bund.de/content/public/securityAdvisory',
        backupUrl: 'https://www.bsi.bund.de/SiteGlobals/Functions/RSSFeed/RSSNewsfeed/RSSBuerger/BSICERTBuerger.xml',
        rateLimitSeconds: 120,
        timeoutSeconds: 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchBSICERT',
      },
      fetcher: fetchBSICERT,
    },
    {
      sourceId: 'microsoft-msrc',
      sourceName: 'Microsoft Security Response Center',
      sourceCategory: 'vendor',
      trustTier: 1,
      defaultFetchIntervalSeconds: 6 * 60 * 60,
      fetchConfig: {
        type: 'api',
        url: 'https://api.msrc.microsoft.com/cvrf/v3.0/updates',
        backupUrl: null,
        rateLimitSeconds: 10,
        timeoutSeconds: 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchMicrosoftMSRC',
      },
      fetcher: fetchMicrosoftMSRC,
    },
    {
      sourceId: 'siemens-cert',
      sourceName: 'Siemens ProductCERT Security Advisories',
      sourceCategory: 'vendor',
      trustTier: 1,
      defaultFetchIntervalSeconds: 6 * 60 * 60,
      fetchConfig: {
        type: 'api',
        url: 'https://cert-portal.siemens.com/productcert/csaf/ssa-feed-tlp-white.json',
        backupUrl: 'https://cert-portal.siemens.com/productcert/html/',
        rateLimitSeconds: 60,
        timeoutSeconds: 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchSiemensProductCERT',
      },
      fetcher: fetchSiemensProductCERT,
    },
    {
      sourceId: 'microsoft-message-center',
      sourceName: 'Microsoft 365 Message Center',
      sourceCategory: 'tenant',
      trustTier: 1,
      defaultFetchIntervalSeconds: 4 * 60 * 60,
      fetchConfig: {
        type: 'api',
        url: 'https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/messages',
        backupUrl: null,
        rateLimitSeconds: 5,
        timeoutSeconds: 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchM365MessageCenter',
      },
      fetcher: fetchM365MessageCenter,
    },
    {
      sourceId: 'microsoft-service-health',
      sourceName: 'Microsoft 365 Service Health',
      sourceCategory: 'tenant',
      trustTier: 1,
      defaultFetchIntervalSeconds: 15 * 60,
      fetchConfig: {
        type: 'api',
        url: 'https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/issues',
        backupUrl: null,
        rateLimitSeconds: 5,
        timeoutSeconds: 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchM365ServiceHealth',
      },
      fetcher: fetchM365ServiceHealth,
    },
    {
      sourceId: 'microsoft-roadmap',
      sourceName: 'Microsoft 365 Roadmap',
      sourceCategory: 'tenant',
      trustTier: 1,
      defaultFetchIntervalSeconds: 24 * 60 * 60,
      fetchConfig: {
        type: 'api',
        url: 'https://graph.microsoft.com/v1.0/admin/serviceAnnouncement/messages',
        backupUrl: null,
        rateLimitSeconds: 5,
        timeoutSeconds: 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchM365Roadmap',
      },
      fetcher: fetchM365Roadmap,
    },
    ...RSS_SOURCES.map(config => ({
      sourceId: config.sourceId,
      sourceName: config.sourceName,
      sourceCategory: config.sourceCategory,
      trustTier: config.trustTier,
      defaultFetchIntervalSeconds: config.sourceCategory === 'news' ? 6 * 60 * 60 : 12 * 60 * 60,
      fetchConfig: {
        type: 'rss' as const,
        url: config.url,
        backupUrl: null,
        rateLimitSeconds: config.sourceCategory === 'news' ? 30 : 60,
        timeoutSeconds: config.sourceCategory === 'news' ? 20 : 30,
        headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
        parser: 'fetchGenericRSS',
      },
      fetcher: () => fetchGenericRSS(config),
    })),
  ];

  const effectiveSources = ENABLE_TENANT_SOURCES
    ? sources
    : sources.filter(source => source.sourceCategory !== 'tenant');

  if (!ENABLE_TENANT_SOURCES) {
    console.log(`[${runId}] Tenant-Quellen sind in der Public-Version deaktiviert.`);
  }

  for (const source of effectiveSources) {
    const fetchAllowed = await shouldFetchSource(source, now);
    if (!fetchAllowed) {
      console.log(`[${runId}] Skipping ${source.sourceId} (interval not reached or disabled).`);
      continue;
    }

    const sourceStartTime = new Date();
    console.log(`[${runId}] Fetching from ${source.sourceName} (${source.sourceId})...`);

    try {
      const fetchResult = await source.fetcher();
      const alerts = fetchResult.alerts;
      console.log(`[${runId}] ${source.sourceName}: Fetched ${alerts.length} items`);

      let rawBlobPath: string | null = null;
      if (blobCachingAvailable && fetchResult.rawCache.length) {
        try {
          rawBlobPath = await cacheSourceRaw(runId, source.sourceId, source.sourceName, fetchResult.rawCache);
          for (const alert of alerts) {
            alert.rawBlobPath = rawBlobPath;
          }
        } catch (error: any) {
          console.warn(`[${runId}] ${source.sourceId}: Failed to cache raw source data to Blob Storage: ${error?.message ?? String(error)}`);
        }
      }

      // Process and store each alert
      let newCount = 0;
      let dupCount = 0;
      let errorCount = 0;

      for (const partialAlert of alerts) {
        try {
          const result = await storeAlert(partialAlert);
          if (result === 'new') {
            newCount++;
          } else if (result === 'duplicate') {
            dupCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(`[${runId}] Error storing alert: ${error.message}`);
        }
      }

      totalFetched += alerts.length;
      totalNew += newCount;
      totalDuplicate += dupCount;
      totalErrors += errorCount;

      const durationMs = new Date().getTime() - sourceStartTime.getTime();
      const status: FetchLog['status'] =
        errorCount > 0 && newCount === 0 ? 'error' : errorCount > 0 ? 'partial' : 'success';

      // Log fetch operation
      await logFetch(runId, source.sourceId, {
        startedAt: sourceStartTime.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs,
        status,
        itemsFetched: alerts.length,
        itemsNew: newCount,
        itemsDuplicate: dupCount,
        itemsError: errorCount,
        error: null,
        errorStack: null,
        rawBlobPath,
      });

      console.log(
        `[${runId}] ${source.sourceName}: ${newCount} new, ${dupCount} duplicates, ${errorCount} errors (${durationMs}ms)`
      );

      await upsertSourceRegistryEntry(source, {
        status,
        lastFetchAt: new Date().toISOString(),
        itemsFetched: alerts.length,
        error: null,
      });

      sourceSummaries.push({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        status,
        startedAt: sourceStartTime.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs,
        itemsFetched: alerts.length,
        itemsNew: newCount,
        itemsDuplicate: dupCount,
        itemsError: errorCount,
        rawBlobPath,
        error: null,
      });
    } catch (error: any) {
      totalErrors++;
      console.error(`[${runId}] Failed to fetch from ${source.sourceName}:`, error);

      // Log failed fetch
      const errorMessage = error?.message || String(error);
      const errorStack = error?.stack || null;

      await logFetch(runId, source.sourceId, {
        startedAt: sourceStartTime.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: new Date().getTime() - sourceStartTime.getTime(),
        status: 'error',
        itemsFetched: 0,
        itemsNew: 0,
        itemsDuplicate: 0,
        itemsError: 1,
        error: errorMessage,
        errorStack,
        rawBlobPath: null,
      });

      await upsertSourceRegistryEntry(source, {
        status: 'error',
        lastFetchAt: new Date().toISOString(),
        itemsFetched: 0,
        error: errorMessage,
      });

      sourceSummaries.push({
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        status: 'error',
        startedAt: sourceStartTime.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: new Date().getTime() - sourceStartTime.getTime(),
        itemsFetched: 0,
        itemsNew: 0,
        itemsDuplicate: 0,
        itemsError: 1,
        rawBlobPath: null,
        error: errorMessage,
      });
    }
  }

  // NVD CVSS enrichment pass (updates existing alerts with missing CVSS scores)
  const nvdStartTime = new Date();
  console.log(`[${runId}] Starting NVD CVSS enrichment...`);
  try {
    const enrichment = await enrichCvssFromNvd(runId, {
      apiKey: NVD_API_KEY,
      rateLimitSeconds: NVD_RATE_LIMIT_SECONDS,
      maxRequests: NVD_MAX_REQUESTS,
    });

    const durationMs = new Date().getTime() - nvdStartTime.getTime();
    const status: FetchLog['status'] = enrichment.errorCount > 0 ? 'partial' : 'success';

    totalErrors += enrichment.errorCount;

    await logFetch(runId, 'nist-nvd', {
      startedAt: nvdStartTime.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      status,
      itemsFetched: enrichment.cvesQueried,
      itemsNew: enrichment.alertsUpdated,
      itemsDuplicate: 0,
      itemsError: enrichment.errorCount,
      error: enrichment.errorCount > 0 ? 'One or more NVD lookups failed' : null,
      errorStack: null,
      rawBlobPath: enrichment.rawBlobPath,
    });

    await upsertSourceRegistryEntry(
      {
        sourceId: 'nist-nvd',
        sourceName: 'NIST National Vulnerability Database',
        sourceCategory: 'government',
        trustTier: 1,
        defaultFetchIntervalSeconds: 24 * 60 * 60,
        fetchConfig: {
          type: 'api',
          url: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
          backupUrl: null,
          rateLimitSeconds: NVD_RATE_LIMIT_SECONDS,
          timeoutSeconds: 30,
          headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
          parser: 'fetchNvdCvssByCveIds',
        },
        fetcher: async () => ({ alerts: [], rawCache: [] }),
      },
      {
        status,
        lastFetchAt: new Date().toISOString(),
        itemsFetched: enrichment.cvesQueried,
        error: enrichment.errorCount > 0 ? 'partial failures' : null,
      }
    );

    sourceSummaries.push({
      sourceId: 'nist-nvd',
      sourceName: 'NIST National Vulnerability Database',
      status,
      startedAt: nvdStartTime.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      itemsFetched: enrichment.cvesQueried,
      itemsNew: enrichment.alertsUpdated,
      itemsDuplicate: 0,
      itemsError: enrichment.errorCount,
      rawBlobPath: enrichment.rawBlobPath,
      error: enrichment.errorCount > 0 ? 'partial failures' : null,
    });

    console.log(
      `[${runId}] NVD enrichment: ${enrichment.alertsUpdated} alerts updated (${enrichment.cvesQueried} CVEs queried, ${enrichment.errorCount} errors)`
    );
  } catch (error: any) {
    totalErrors += 1;
    console.warn(`[${runId}] NVD enrichment failed: ${error?.message ?? String(error)}`);

    const durationMs = new Date().getTime() - nvdStartTime.getTime();

    await logFetch(runId, 'nist-nvd', {
      startedAt: nvdStartTime.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      status: 'error',
      itemsFetched: 0,
      itemsNew: 0,
      itemsDuplicate: 0,
      itemsError: 1,
      error: error?.message ?? String(error),
      errorStack: error?.stack ?? null,
      rawBlobPath: null,
    });

    await upsertSourceRegistryEntry(
      {
        sourceId: 'nist-nvd',
        sourceName: 'NIST National Vulnerability Database',
        sourceCategory: 'government',
        trustTier: 1,
        defaultFetchIntervalSeconds: 24 * 60 * 60,
        fetchConfig: {
          type: 'api',
          url: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
          backupUrl: null,
          rateLimitSeconds: NVD_RATE_LIMIT_SECONDS,
          timeoutSeconds: 30,
          headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
          parser: 'fetchNvdCvssByCveIds',
        },
        fetcher: async () => ({ alerts: [], rawCache: [] }),
      },
      {
        status: 'error',
        lastFetchAt: new Date().toISOString(),
        itemsFetched: 0,
        error: error?.message ?? String(error),
      }
    );

    sourceSummaries.push({
      sourceId: 'nist-nvd',
      sourceName: 'NIST National Vulnerability Database',
      status: 'error',
      startedAt: nvdStartTime.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs,
      itemsFetched: 0,
      itemsNew: 0,
      itemsDuplicate: 0,
      itemsError: 1,
      rawBlobPath: null,
      error: error?.message ?? String(error),
    });
  }

  const endTime = new Date();
  const totalDuration = endTime.getTime() - startTime.getTime();

  console.log(`[${runId}] Fetch cycle completed in ${totalDuration}ms`);
  console.log(`[${runId}] Total: ${totalFetched} fetched, ${totalNew} new, ${totalDuplicate} duplicates, ${totalErrors} errors`);

  // Snapshot metadata for the whole run
  if (blobCachingAvailable) {
    try {
      const snapshotPath = await writeRunSnapshot(runId, startTime, endTime, {
        totalFetched,
        totalNew,
        totalDuplicate,
        totalErrors,
      }, sourceSummaries);
      console.log(`[${runId}] Snapshot stored: ${snapshotPath}`);
    } catch (error: any) {
      console.warn(`[${runId}] Failed to write fetch-snapshot: ${error?.message ?? String(error)}`);
    }
  }

  return {
    runId,
    totalFetched,
    totalNew,
    totalDuplicate,
    totalErrors,
  };
}

async function shouldFetchSource(source: FetchSource, now: Date): Promise<boolean> {
  const fallbackIntervalSeconds = source.defaultFetchIntervalSeconds || 6 * 60 * 60;

  let existing: SourceRegistryEntry | null = null;
  try {
    const { resource } = await sourceRegistryContainer.item(source.sourceId, source.sourceCategory).read<SourceRegistryEntry>();
    if (resource) existing = resource;
  } catch (error: any) {
    const statusCode = error?.code || error?.statusCode;
    if (statusCode !== 404) {
      console.warn(
        `[${source.sourceId}] Failed to read source_registry entry for interval check: ${error?.message || String(error)}`
      );
    }
    // If we can't read the registry entry, keep legacy behavior and fetch.
    return true;
  }

  if (existing && existing.isEnabled === false) return false;

  const override = existing?.fetchIntervalOverride;
  const intervalSeconds =
    typeof override === 'number' && Number.isFinite(override) && override > 0 ? override : fallbackIntervalSeconds;

  const last = existing?.lastFetchAt ? new Date(existing.lastFetchAt) : null;
  if (!last || !Number.isFinite(last.getTime())) return true;

  const elapsedMs = now.getTime() - last.getTime();
  return elapsedMs >= intervalSeconds * 1000;
}

/**
 * Store alert in Cosmos DB with deduplication
 */
async function storeAlert(partialAlert: PartialAlert): Promise<'new' | 'duplicate'> {
  const now = new Date().toISOString();
  const contentHash = computeContentHash(partialAlert);

  // Check if alert already exists
  const query = {
    query: 'SELECT VALUE c.id FROM c WHERE c.sourceId = @sourceId AND c.contentHash = @contentHash',
    parameters: [
      { name: '@sourceId', value: partialAlert.sourceId },
      { name: '@contentHash', value: contentHash },
    ],
  };

  const { resources: existing } = await alertsContainer.items.query<string>(query, {
    partitionKey: partialAlert.sourceId,
  }).fetchAll();

  if (existing.length > 0) {
    return 'duplicate';
  }

  // Create full alert document
  const alert: CyberRadarAlert = {
    ...partialAlert,
    id: uuidv4(),
    contentHash,
    fetchedAt: now,
    updatedAt: now,
  };

  // Store in Cosmos DB
  await alertsContainer.items.create(alert);

  return 'new';
}

/**
 * Log fetch operation
 */
async function logFetch(
  runId: string,
  sourceId: string,
  data: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    status: 'success' | 'partial' | 'error';
    itemsFetched: number;
    itemsNew: number;
    itemsDuplicate: number;
    itemsError: number;
    error: string | null;
    errorStack: string | null;
    rawBlobPath: string | null;
  }
): Promise<void> {
  const log: FetchLog = {
    id: uuidv4(),
    runId,
    sourceId,
    ...data,
  };

  await logsContainer.items.create(log);
}

async function upsertSourceRegistryEntry(
  source: FetchSource,
  data: {
    status: SourceRegistryEntry['lastFetchStatus'];
    lastFetchAt: string;
    itemsFetched: number;
    error: string | null;
  }
): Promise<void> {
  let existing: SourceRegistryEntry | null = null;

  try {
    const { resource } = await sourceRegistryContainer.item(source.sourceId, source.sourceCategory).read<SourceRegistryEntry>();
    if (resource) existing = resource;
  } catch (error: any) {
    const statusCode = error?.code || error?.statusCode;
    if (statusCode !== 404) {
      console.warn(`[${source.sourceId}] Failed to read existing source_registry entry: ${error?.message || String(error)}`);
    }
  }

  const previousConsecutiveErrors = existing?.consecutiveErrors ?? 0;
  const consecutiveErrors = data.status === 'success' ? 0 : previousConsecutiveErrors + 1;

  const entry: SourceRegistryEntry = {
    id: source.sourceId,
    sourceId: source.sourceId,
    category: source.sourceCategory,

    name: source.sourceName,
    nameDE: source.sourceName,
    trustTier: source.trustTier,

    fetchConfig: {
      type: source.fetchConfig.type,
      url: source.fetchConfig.url,
      backupUrl: source.fetchConfig.backupUrl,
      rateLimit: source.fetchConfig.rateLimitSeconds,
      timeout: source.fetchConfig.timeoutSeconds,
      headers: source.fetchConfig.headers,
      parser: source.fetchConfig.parser,
    },

    lastFetchAt: data.lastFetchAt,
    lastFetchStatus: data.status,
    lastFetchItemCount: data.itemsFetched,
    lastFetchError: data.error,
    consecutiveErrors,

    isEnabled: consecutiveErrors >= 6 ? false : existing?.isEnabled ?? true,
    fetchIntervalOverride: existing?.fetchIntervalOverride ?? null,
  };

  await sourceRegistryContainer.items.upsert(entry);
}

async function ensureBlobContainersExist(): Promise<void> {
  await Promise.all([
    sourceCacheContainer.createIfNotExists(),
    snapshotsContainer.createIfNotExists(),
  ]);
}

async function cacheSourceRaw(
  runId: string,
  sourceId: string,
  sourceName: string,
  rawCache: RawCacheItem[]
): Promise<string> {
  const now = new Date();
  const dateFolder = now.toISOString().slice(0, 10);
  const timeStamp = now.toISOString().slice(11, 19).replace(/:/g, '');
  const prefix = `${sourceId}/${dateFolder}/`;

  const uploaded: Array<{ label: string; url: string; contentType: string; blobName: string }> = [];

  for (const item of rawCache) {
    const hash = sha256Hex(item.body).slice(0, 12);
    const blobName = `${prefix}${timeStamp}_${hash}.${item.extension}`;

    await uploadTextBlob(sourceCacheContainer, blobName, item.body, item.contentType);
    uploaded.push({
      label: item.label,
      url: item.url,
      contentType: item.contentType,
      blobName,
    });
  }

  const manifest = {
    runId,
    sourceId,
    sourceName,
    cachedAt: now.toISOString(),
    items: uploaded,
  };

  const manifestBlobName = `${prefix}${timeStamp}_${runId}_manifest.json`;
  await uploadTextBlob(sourceCacheContainer, manifestBlobName, JSON.stringify(manifest, null, 2), 'application/json');

  return manifestBlobName;
}

async function writeRunSnapshot(
  runId: string,
  startedAt: Date,
  completedAt: Date,
  totals: {
    totalFetched: number;
    totalNew: number;
    totalDuplicate: number;
    totalErrors: number;
  },
  sources: any[]
): Promise<string> {
  const dateFolder = startedAt.toISOString().slice(0, 10);
  const blobName = `${dateFolder}/${runId}.json`;

  const snapshot = {
    runId,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totals,
    sources,
  };

  await uploadTextBlob(snapshotsContainer, blobName, JSON.stringify(snapshot, null, 2), 'application/json');
  return blobName;
}

async function uploadTextBlob(container: any, blobName: string, body: string, contentType: string): Promise<void> {
  const client = container.getBlockBlobClient(blobName);
  await client.upload(body, Buffer.byteLength(body, 'utf8'), {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function parseOptionalInt(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function enrichCvssFromNvd(
  runId: string,
  options: { apiKey: string | null; rateLimitSeconds: number; maxRequests: number }
): Promise<{ cvesQueried: number; alertsUpdated: number; errorCount: number; rawBlobPath: string | null }> {
  const cutoffIso = subDaysIso(14);

  const { resources: candidates } = await alertsContainer.items.query<any>({
    query: 'SELECT c.id, c.sourceId, c.cveIds FROM c WHERE IS_NULL(c.cvssScore) AND ARRAY_LENGTH(c.cveIds) > 0 AND c.fetchedAt >= @cutoff',
    parameters: [{ name: '@cutoff', value: cutoffIso }],
  }).fetchAll();

  const priority = ['cisa-kev', 'siemens-cert', 'microsoft-msrc', 'bsi-cert', 'cisa-advisories', 'cisa-ics'];
  candidates.sort((a: any, b: any) => {
    const ai = priority.indexOf(a.sourceId);
    const bi = priority.indexOf(b.sourceId);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    return aRank - bRank;
  });

  const cveIds: string[] = [];
  for (const c of candidates) {
    for (const cveId of (c.cveIds || [])) {
      if (typeof cveId === 'string') cveIds.push(cveId.toUpperCase());
    }
  }

  const nvd = await fetchNvdCvssByCveIds(cveIds, {
    apiKey: options.apiKey,
    rateLimitSeconds: options.rateLimitSeconds,
    timeoutMs: 30000,
    maxRequests: options.maxRequests,
  });

  let rawBlobPath: string | null = null;
  try {
    rawBlobPath = await cacheSourceRaw(runId, 'nist-nvd', 'NIST National Vulnerability Database', [
      {
        label: 'nvd-responses',
        url: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
        contentType: 'application/json',
        extension: 'json',
        body: JSON.stringify(
          {
            fetchedAt: new Date().toISOString(),
            requestedCves: Array.from(new Set(cveIds)).slice(0, options.maxRequests),
            responses: nvd.rawResponses,
          },
          null,
          2
        ),
      },
    ]);
  } catch (error: any) {
    console.warn(`[${runId}] Failed to cache NVD raw responses: ${error?.message ?? String(error)}`);
  }

  const nowIso = new Date().toISOString();
  let alertsUpdated = 0;

  for (const candidate of candidates) {
    const id = candidate.id;
    const sourceId = candidate.sourceId;
    const itemCves: string[] = Array.isArray(candidate.cveIds) ? candidate.cveIds : [];

    let bestScore: number | null = null;
    let bestVector: string | null = null;

    for (const cveId of itemCves) {
      if (typeof cveId !== 'string') continue;
      const info = nvd.results.get(cveId.toUpperCase());
      if (!info || typeof info.cvssScore !== 'number') continue;
      if (bestScore === null || info.cvssScore > bestScore) {
        bestScore = info.cvssScore;
        bestVector = info.cvssVector;
      }
    }

    if (bestScore === null) continue;

    try {
      const { resource } = await alertsContainer.item(id, sourceId).read<CyberRadarAlert>();
      if (!resource) continue;
      if (resource.cvssScore !== null && resource.cvssScore !== undefined) continue;

      const patchOps: any[] = [
        { op: 'set', path: '/cvssScore', value: bestScore },
        { op: 'set', path: '/cvssVector', value: bestVector },
        { op: 'set', path: '/updatedAt', value: nowIso },
      ];

      if (resource.severity === null || resource.severity === undefined) {
        patchOps.push({ op: 'set', path: '/severity', value: cvssToSeverity(bestScore) });
      }

      await alertsContainer.item(id, sourceId).patch(patchOps);
      alertsUpdated += 1;
    } catch (error: any) {
      console.warn(`[${runId}] Failed to update CVSS for alert ${id} (${sourceId}): ${error?.message ?? String(error)}`);
    }
  }

  return {
    cvesQueried: Math.min(new Set(cveIds).size, options.maxRequests),
    alertsUpdated,
    errorCount: nvd.errorCount,
    rawBlobPath,
  };
}

function subDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}


