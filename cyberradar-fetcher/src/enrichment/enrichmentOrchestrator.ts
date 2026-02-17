// © 2025 CyberLage
/**
 * Enrichment Orchestrator
 * Ties together CVSS/EPSS enrichment, AI analysis, and Cosmos updates.
 * Processes alerts sequentially with rate limiting.
 */

import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { CyberRadarAlert } from '../types/schema';
import { EnrichmentRunOptions, EnrichmentRunResult } from '../types/enrichment';
import { analyzeWithRetry } from './aiAnalyzer';
import { analyzeWithRetryV3 } from './aiAnalyzerV3';
import { applyEnrichmentParsed, ensureSeverity } from './enrichmentApplier';
import { applyEnrichmentParsedV3 } from './enrichmentApplierV3';
import { validatePublicComplianceForAlert } from './publicComplianceValidator';
import { enrichCvss, enrichEpss } from './vulnEnrichment';
import { calculateRiskScore, determineSeverityV3 } from '../lib/scoring';
import { extractWidId, fetchBsiCsaf, CsafResult } from '../lib/bsiCsaf';

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING!;
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || 'cyberradar';

const cosmosClient = new CosmosClient(COSMOS_CONNECTION_STRING);
const database = cosmosClient.database(COSMOS_DATABASE);
const alertsContainer = database.container('raw_alerts');
const logsContainer = database.container('fetch_logs');

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const CSAF_CACHE = new Map<string, CsafResult>();

async function maybeFetchBsiCsafForAlert(alert: CyberRadarAlert): Promise<void> {
  if (alert.sourceId !== 'bsi-cert') return;
  if (alert.csafDescription || alert.csafRecommendations) return;

  const widId = extractWidId(alert.description) || extractWidId(alert.title);
  if (!widId) return;

  const cached = CSAF_CACHE.get(widId);
  if (cached) {
    if (cached.fetchSuccess) {
      alert.csafDescription = cached.fullDescription;
      alert.csafRecommendations = cached.recommendations;
      if (cached.affectedVersions.length > 0) {
        alert.affectedVersions = cached.affectedVersions;
      }
      alert.sourceUrl = `https://wid.cert-bund.de/portal/wid/${widId}`;
    }
    return;
  }

  const csaf = await fetchBsiCsaf(widId);
  CSAF_CACHE.set(widId, csaf);

  if (csaf.fetchSuccess) {
    alert.csafDescription = csaf.fullDescription;
    alert.csafRecommendations = csaf.recommendations;
    if (csaf.affectedVersions.length > 0) {
      alert.affectedVersions = csaf.affectedVersions;
    }
    alert.sourceUrl = `https://wid.cert-bund.de/portal/wid/${widId}`;
  }

  // Be polite to BSI servers.
  await sleep(500);
}

function applyDeterministicScoringV3(alert: CyberRadarAlert): void {
  const cveCount = Array.isArray(alert.cveIds) ? alert.cveIds.length : 0;

  const result = calculateRiskScore({
    cvssScore: alert.cvssScore ?? null,
    epssScore: alert.epssScore ?? null,
    epssPercentile: alert.epssPercentile ?? null,
    isActivelyExploited: !!alert.isActivelyExploited,
    isZeroDay: !!alert.isZeroDay,
    alertType: alert.alertType,
    sourceName: alert.sourceName,
    sourceTrustTier: alert.sourceTrustTier,
    cveCount,
    affectedProducts: Array.isArray(alert.affectedProducts) ? alert.affectedProducts : [],
    severity: alert.severity ?? null,
    m365IsMajorChange: (alert as any).m365IsMajorChange ?? undefined,
    m365ActionRequiredBy: (alert as any).m365ActionRequiredBy ?? null,
    m365Status: (alert as any).m365Status ?? null,
  });

  alert.aiScore = result.aiScore;
  alert.aiScoreReasoning = result.aiScoreReasoning;
  alert.scoreComponents = result.scoreComponents;

  // Deterministic severity (keeps AI if consistent; otherwise corrects).
  alert.severity = determineSeverityV3({
    severity: alert.severity ?? null,
    cvssScore: alert.cvssScore ?? null,
    aiScore: alert.aiScore ?? null,
    isActivelyExploited: !!alert.isActivelyExploited,
  }) as any;
}

function cloneCompliance(
  compliance: CyberRadarAlert['compliance'] | null | undefined
): CyberRadarAlert['compliance'] {
  return {
    nis2: compliance?.nis2 ?? null,
    dora: compliance?.dora ?? null,
    gdpr: compliance?.gdpr ?? null,
    iso27001: compliance?.iso27001 ?? null,
    aiAct: compliance?.aiAct ?? null,
    sectors: compliance?.sectors ?? null,
  };
}

/** GPT-4o pricing: input $2.50/1M, output $10.00/1M */
function estimateCost(totalTokens: number): number {
  // Rough split: 70% input, 30% output
  const inputTokens = totalTokens * 0.7;
  const outputTokens = totalTokens * 0.3;
  return (inputTokens * 2.5 + outputTokens * 10.0) / 1_000_000;
}

// ══════════════════════════════════════════════════════════
// COSMOS QUERIES
// ══════════════════════════════════════════════════════════

async function getUnprocessedAlerts(limit: number): Promise<CyberRadarAlert[]> {
  const query = {
    query: 'SELECT * FROM c WHERE c.isProcessed = false ORDER BY c.fetchedAt ASC OFFSET 0 LIMIT @limit',
    parameters: [{ name: '@limit', value: limit }],
  };
  const { resources } = await alertsContainer.items
    .query<CyberRadarAlert>(query, { maxItemCount: limit })
    .fetchAll();
  return resources;
}

async function getAlertById(alertId: string): Promise<CyberRadarAlert[]> {
  const query = {
    query: 'SELECT * FROM c WHERE c.id = @id',
    parameters: [{ name: '@id', value: alertId }],
  };
  const { resources } = await alertsContainer.items
    .query<CyberRadarAlert>(query)
    .fetchAll();
  return resources;
}

async function updateAlert(
  id: string,
  sourceId: string,
  updates: Partial<CyberRadarAlert>
): Promise<void> {
  const { resource: existing } = await alertsContainer.item(id, sourceId).read<CyberRadarAlert>();
  if (!existing) throw new Error(`Alert ${id} not found`);

  const merged = { ...existing, ...updates };
  await alertsContainer.item(id, sourceId).replace(merged);
}

async function logEnrichmentRun(
  result: EnrichmentRunResult,
  source: string,
  options?: { type?: 'enrichment' | 're-enrichment'; pipelineSourceId?: string }
): Promise<void> {
  const log = {
    id: uuidv4(),
    runId: result.runId,
    type: options?.type || 'enrichment',
    source,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    durationMs: result.durationMs,
    status: result.totalFailed > 0 ? 'partial' : 'success',
    totalProcessed: result.totalProcessed,
    totalSuccess: result.totalSuccess,
    totalFailed: result.totalFailed,
    totalSkipped: result.totalSkipped,
    totalTokensUsed: result.totalTokensUsed,
    estimatedCostUSD: result.estimatedCostUSD,
    errors: result.errors,
    // For compatibility with existing fetch_logs schema
    itemsFetched: result.totalProcessed,
    itemsNew: result.totalSuccess,
    itemsDuplicate: 0,
    itemsError: result.totalFailed,
    error: result.totalFailed > 0 ? `${result.totalFailed} alerts failed enrichment` : null,
    errorStack: null,
    rawBlobPath: null,
    sourceId: options?.pipelineSourceId || 'enrichment-pipeline',
  };

  await logsContainer.items.create(log);
}

// ══════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ══════════════════════════════════════════════════════════

export async function runEnrichment(options: EnrichmentRunOptions): Promise<EnrichmentRunResult> {
  const runId = uuidv4();
  const startedAt = new Date();
  const errors: { alertId: string; error: string }[] = [];
  let totalTokens = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  console.log(`[${runId}] Enrichment run starting. Max: ${options.maxAlerts}, Source: ${options.source}`);

  // ── STEP 1: Fetch unprocessed alerts ──
  const alerts = options.alertId
    ? await getAlertById(options.alertId)
    : await getUnprocessedAlerts(options.maxAlerts);

  console.log(`[${runId}] Found ${alerts.length} alerts to process`);

  if (alerts.length === 0) {
    const result = buildResult(runId, startedAt, 0, 0, 0, 0, 0, []);
    await logEnrichmentRun(result, options.source);
    return result;
  }

  // ── STEP 2: Process each alert ──
  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];

    try {
      console.log(`[${runId}] Processing ${i + 1}/${alerts.length}: ${alert.id} (${alert.sourceId})`);

      // 2a. CVSS (NVD) + EPSS enrichment (only when missing)
      if (Array.isArray(alert.cveIds) && alert.cveIds.length > 0) {
        if (alert.cvssScore === null || alert.cvssScore === undefined) {
          const cvss = await enrichCvss(alert.cveIds);
          if (cvss.cvssScore !== null) {
            alert.cvssScore = cvss.cvssScore;
            alert.cvssVector = cvss.cvssVector;
            alert.cvssCveId = cvss.cvssCveId;
          }
        }

        if (alert.epssScore === null || alert.epssScore === undefined) {
          const epss = await enrichEpss(alert.cveIds);
          alert.epssScore = epss.epssScore;
          alert.epssPercentile = epss.epssPercentile;
        }
      }

      // 2a.1 Richer context for BSI alerts (CSAF detail)
      await maybeFetchBsiCsafForAlert(alert);

      // 2a.2 Deterministic scoring + severity (V3)
      applyDeterministicScoringV3(alert);

      // 2b. AI analysis (V3: summaries + compliance only; no scoring/severity)
      const aiResult = await analyzeWithRetryV3(alert as any);
      if (!aiResult) {
        skippedCount++;
        errors.push({ alertId: alert.id, error: 'AI analysis returned null (skipped)' });
        continue;
      }
      totalTokens += aiResult.tokensUsed || 0;

      // 2c. Apply AI enrichment (V3)
      applyEnrichmentParsedV3(alert, aiResult as any);

      const complianceAiRaw = cloneCompliance(alert.compliance);
      const validationResult = validatePublicComplianceForAlert(alert);
      alert.compliance = validationResult.complianceFinal;
      alert.complianceEvidence = validationResult.complianceEvidence;
      alert.compliancePolicyVersion = validationResult.complianceEvidence.policyVersion;
      alert.complianceAiRaw = complianceAiRaw;

      const cosmosUpdate: Partial<CyberRadarAlert> = {
        // CVSS/EPSS fields
        cvssScore: alert.cvssScore ?? null,
        cvssVector: alert.cvssVector ?? null,
        cvssCveId: alert.cvssCveId ?? null,
        epssScore: alert.epssScore ?? null,
        epssPercentile: alert.epssPercentile ?? null,

        // AI fields
        severity: alert.severity ?? null,
        aiScore: alert.aiScore ?? null,
        aiScoreReasoning: alert.aiScoreReasoning ?? null,
        scoreComponents: alert.scoreComponents ?? null,
        summary: alert.summary ?? null,
        summaryDe: alert.summaryDe ?? null,
        titleDe: alert.titleDe ?? null,
        compliance: alert.compliance as any,
        compliancePolicyVersion: alert.compliancePolicyVersion ?? null,
        complianceAiRaw: alert.complianceAiRaw ?? null,
        complianceEvidence: alert.complianceEvidence ?? null,

        // Rich BSI CSAF fields (when available)
        csafDescription: alert.csafDescription ?? null,
        csafRecommendations: alert.csafRecommendations ?? null,
        affectedVersions: Array.isArray(alert.affectedVersions) ? alert.affectedVersions : null,
        sourceUrl: alert.sourceUrl,

        // Processing state
        isProcessed: true,
        processingState: 'enriched',
        enrichmentVersion: 3,
        updatedAt: new Date().toISOString(),
      };

      await updateAlert(alert.id, alert.sourceId, cosmosUpdate);
      successCount++;
      console.log(`[${runId}] Updated alert ${alert.id} — aiScore: ${alert.aiScore}, severity: ${alert.severity}`);

      // Rate limiting pause between AI calls
      if (i < alerts.length - 1) {
        await sleep(500);
      }
    } catch (error: any) {
      failedCount++;
      errors.push({ alertId: alert.id, error: error?.message || String(error) });
      console.error(`[${runId}] Failed: ${alert.id}:`, error?.message || error);
    }
  }

  // ── STEP 3: Log the run ──
  const result = buildResult(runId, startedAt, alerts.length, successCount, failedCount, skippedCount, totalTokens, errors);
  await logEnrichmentRun(result, options.source);

  console.log(
    `[${runId}] Enrichment complete. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}, Tokens: ${totalTokens}`
  );

  return result;
}

interface ReEnrichmentRunOptions {
  limit?: number;
  sourceId?: string;
  missingOnly?: boolean;
  forceAll?: boolean;
  maxDurationMs?: number;
}

async function getAlertsForReEnrichment(options: ReEnrichmentRunOptions): Promise<CyberRadarAlert[]> {
  const where: string[] = [];
  const parameters: { name: string; value: any }[] = [];

  if (options.sourceId) {
    where.push('c.sourceId = @sourceId');
    parameters.push({ name: '@sourceId', value: options.sourceId });
  }

  if (options.missingOnly) {
    where.push('(IS_NULL(c.severity) OR IS_NULL(c.cvssScore) OR IS_NULL(c.epssScore))');
  } else if (!options.forceAll) {
    // Default behavior: only process items that haven't been re-enriched with v2 yet.
    where.push('((NOT IS_DEFINED(c.enrichmentVersion)) OR IS_NULL(c.enrichmentVersion) OR c.enrichmentVersion < 2)');
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  let query = `SELECT * FROM c ${whereClause} ORDER BY c.fetchedAt DESC`;
  if (typeof options.limit === 'number' && options.limit > 0) {
    query += ' OFFSET 0 LIMIT @limit';
    parameters.push({ name: '@limit', value: options.limit });
  }

  const { resources } = await alertsContainer.items
    .query<CyberRadarAlert>({ query, parameters }, { maxItemCount: options.limit || 100 })
    .fetchAll();

  return resources;
}

/**
 * Manual re-enrichment for existing alerts.
 * Always runs the AI enrichment to refresh score + compliance mapping.
 * CVSS/EPSS are fetched only when missing.
 */
export async function runReEnrichment(options: ReEnrichmentRunOptions): Promise<EnrichmentRunResult> {
  const runId = uuidv4();
  const startedAt = new Date();
  const errors: { alertId: string; error: string }[] = [];

  const batchSize = 25;
  const batchPauseMs = 2000;

  let totalTokens = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let attemptedCount = 0;

  const deadlineMs =
    typeof options.maxDurationMs === 'number' && options.maxDurationMs > 0
      ? startedAt.getTime() + options.maxDurationMs
      : null;

  const isTimeNearlyUp = (): boolean => {
    if (deadlineMs === null) return false;
    // Keep a small buffer to finish logging and Cosmos writes.
    return Date.now() > deadlineMs - 15_000;
  };

  console.log(`[${runId}] Re-enrichment starting. Limit: ${options.limit ?? 'ALL'}, Source: ${options.sourceId ?? 'ALL'}, MissingOnly: ${!!options.missingOnly}, ForceAll: ${!!options.forceAll}`);

  const alerts = await getAlertsForReEnrichment(options);
  console.log(`[${runId}] Found ${alerts.length} alerts to re-enrich`);

  for (let i = 0; i < alerts.length; i++) {
    if (isTimeNearlyUp()) {
      console.log(`[${runId}] Time budget reached; stopping early after ${attemptedCount}/${alerts.length} alerts.`);
      break;
    }

    const alert = alerts[i];
    attemptedCount++;

    try {
      console.log(`[${runId}] Re-enriching ${i + 1}/${alerts.length}: ${alert.id} (${alert.sourceId})`);

      // CVSS + EPSS (only if missing)
      if (Array.isArray(alert.cveIds) && alert.cveIds.length > 0) {
        if (alert.cvssScore === null || alert.cvssScore === undefined) {
          const cvss = await enrichCvss(alert.cveIds);
          if (cvss.cvssScore !== null) {
            alert.cvssScore = cvss.cvssScore;
            alert.cvssVector = cvss.cvssVector;
            alert.cvssCveId = cvss.cvssCveId;
          }
        }

        if (alert.epssScore === null || alert.epssScore === undefined) {
          const epss = await enrichEpss(alert.cveIds);
          alert.epssScore = epss.epssScore;
          alert.epssPercentile = epss.epssPercentile;
        }
      }

      // ALWAYS re-run AI enrichment
      const aiResult = await analyzeWithRetry(alert);
      if (!aiResult) {
        skippedCount++;
        errors.push({ alertId: alert.id, error: 'AI analysis returned null (skipped)' });
        continue;
      }
      totalTokens += aiResult.tokensUsed || 0;

      applyEnrichmentParsed(alert, aiResult);
      ensureSeverity(alert);

      const cosmosUpdate: Partial<CyberRadarAlert> = {
        cvssScore: alert.cvssScore ?? null,
        cvssVector: alert.cvssVector ?? null,
        cvssCveId: alert.cvssCveId ?? null,
        epssScore: alert.epssScore ?? null,
        epssPercentile: alert.epssPercentile ?? null,

        severity: alert.severity ?? null,
        aiScore: alert.aiScore ?? null,
        aiScoreReasoning: alert.aiScoreReasoning ?? null,
        summary: alert.summary ?? null,
        summaryDe: alert.summaryDe ?? null,
        titleDe: alert.titleDe ?? null,
        compliance: alert.compliance as any,

        isProcessed: true,
        processingState: 'enriched',
        enrichmentVersion: 2,
        updatedAt: new Date().toISOString(),
      };

      await updateAlert(alert.id, alert.sourceId, cosmosUpdate);
      successCount++;

      // Rate limiting pause between AI calls
      if (i < alerts.length - 1) {
        await sleep(500);
      }

      // Batch pause
      if ((i + 1) % batchSize === 0 && i < alerts.length - 1) {
        await sleep(batchPauseMs);
      }
    } catch (error: any) {
      failedCount++;
      errors.push({ alertId: alert.id, error: error?.message || String(error) });
      console.error(`[${runId}] Re-enrich failed: ${alert.id}:`, error?.message || error);
    }
  }

  const result = buildResult(runId, startedAt, attemptedCount, successCount, failedCount, skippedCount, totalTokens, errors);
  await logEnrichmentRun(result, 'manual', { type: 're-enrichment', pipelineSourceId: 're-enrichment-pipeline' });

  console.log(
    `[${runId}] Re-enrichment complete. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}, Tokens: ${totalTokens}`
  );

  return result;
}

interface ReEnrichmentV3RunOptions {
  limit?: number;
  sourceId?: string;
  missingCsaf?: boolean;
  forceAll?: boolean;
  maxDurationMs?: number;
}

async function getAlertsForReEnrichmentV3(options: ReEnrichmentV3RunOptions): Promise<CyberRadarAlert[]> {
  const where: string[] = [];
  const parameters: { name: string; value: any }[] = [];

  if (options.sourceId) {
    where.push('c.sourceId = @sourceId');
    parameters.push({ name: '@sourceId', value: options.sourceId });
  }

  if (options.missingCsaf) {
    where.push("c.sourceId = 'bsi-cert'");
    where.push('((NOT IS_DEFINED(c.csafDescription)) OR IS_NULL(c.csafDescription) OR c.csafDescription = \'\')');
  } else if (!options.forceAll) {
    // Default behavior: only process items that haven't been re-enriched with v3 yet.
    where.push('((NOT IS_DEFINED(c.enrichmentVersion)) OR IS_NULL(c.enrichmentVersion) OR c.enrichmentVersion < 3)');
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  let query = `SELECT * FROM c ${whereClause} ORDER BY c.fetchedAt DESC`;
  if (typeof options.limit === 'number' && options.limit > 0) {
    query += ' OFFSET 0 LIMIT @limit';
    parameters.push({ name: '@limit', value: options.limit });
  }

  const { resources } = await alertsContainer.items
    .query<CyberRadarAlert>({ query, parameters }, { maxItemCount: options.limit || 100 })
    .fetchAll();

  return resources;
}

/**
 * Manual V3 re-enrichment for existing alerts.
 *
 * V3 behavior:
 * - Fetch CSAF detail for BSI alerts when missing
 * - Deterministic scoring + severity (no AI cost)
 * - AI only generates summaries + compliance mapping (cheaper prompt)
 */
export async function runReEnrichmentV3(options: ReEnrichmentV3RunOptions): Promise<EnrichmentRunResult> {
  const runId = uuidv4();
  const startedAt = new Date();
  const errors: { alertId: string; error: string }[] = [];

  const batchSize = 10;
  const batchPauseMs = 3000;

  let totalTokens = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let attemptedCount = 0;

  const deadlineMs =
    typeof options.maxDurationMs === 'number' && options.maxDurationMs > 0
      ? startedAt.getTime() + options.maxDurationMs
      : null;

  const isTimeNearlyUp = (): boolean => {
    if (deadlineMs === null) return false;
    return Date.now() > deadlineMs - 15_000;
  };

  console.log(
    `[${runId}] Re-enrichment V3 starting. Limit: ${options.limit ?? 'ALL'}, Source: ${options.sourceId ?? 'ALL'}, MissingCsaf: ${!!options.missingCsaf}, ForceAll: ${!!options.forceAll}`
  );

  const alerts = await getAlertsForReEnrichmentV3(options);
  console.log(`[${runId}] Found ${alerts.length} alerts to re-enrich (v3)`);

  for (let i = 0; i < alerts.length; i++) {
    if (isTimeNearlyUp()) {
      console.log(`[${runId}] Time budget reached; stopping early after ${attemptedCount}/${alerts.length} alerts.`);
      break;
    }

    const alert = alerts[i];
    attemptedCount++;

    try {
      console.log(`[${runId}] Re-enriching (v3) ${i + 1}/${alerts.length}: ${alert.id} (${alert.sourceId})`);

      // CVSS + EPSS (only if missing)
      if (Array.isArray(alert.cveIds) && alert.cveIds.length > 0) {
        if (alert.cvssScore === null || alert.cvssScore === undefined) {
          const cvss = await enrichCvss(alert.cveIds);
          if (cvss.cvssScore !== null) {
            alert.cvssScore = cvss.cvssScore;
            alert.cvssVector = cvss.cvssVector;
            alert.cvssCveId = cvss.cvssCveId;
          }
        }

        if (alert.epssScore === null || alert.epssScore === undefined) {
          const epss = await enrichEpss(alert.cveIds);
          alert.epssScore = epss.epssScore;
          alert.epssPercentile = epss.epssPercentile;
        }
      }

      // Richer context for BSI alerts (CSAF)
      await maybeFetchBsiCsafForAlert(alert);

      // Deterministic scoring + severity (always)
      applyDeterministicScoringV3(alert);

      // AI enrichment (V3)
      const aiResult = await analyzeWithRetryV3(alert as any);
      if (!aiResult) {
        skippedCount++;
        errors.push({ alertId: alert.id, error: 'AI analysis returned null (skipped)' });
        continue;
      }
      totalTokens += aiResult.tokensUsed || 0;

      applyEnrichmentParsedV3(alert, aiResult as any);

      const complianceAiRaw = cloneCompliance(alert.compliance);
      const validationResult = validatePublicComplianceForAlert(alert);
      alert.compliance = validationResult.complianceFinal;
      alert.complianceEvidence = validationResult.complianceEvidence;
      alert.compliancePolicyVersion = validationResult.complianceEvidence.policyVersion;
      alert.complianceAiRaw = complianceAiRaw;

      const cosmosUpdate: Partial<CyberRadarAlert> = {
        cvssScore: alert.cvssScore ?? null,
        cvssVector: alert.cvssVector ?? null,
        cvssCveId: alert.cvssCveId ?? null,
        epssScore: alert.epssScore ?? null,
        epssPercentile: alert.epssPercentile ?? null,

        severity: alert.severity ?? null,
        aiScore: alert.aiScore ?? null,
        aiScoreReasoning: alert.aiScoreReasoning ?? null,
        scoreComponents: alert.scoreComponents ?? null,

        summary: alert.summary ?? null,
        summaryDe: alert.summaryDe ?? null,
        titleDe: alert.titleDe ?? null,
        compliance: alert.compliance as any,
        compliancePolicyVersion: alert.compliancePolicyVersion ?? null,
        complianceAiRaw: alert.complianceAiRaw ?? null,
        complianceEvidence: alert.complianceEvidence ?? null,

        csafDescription: alert.csafDescription ?? null,
        csafRecommendations: alert.csafRecommendations ?? null,
        affectedVersions: Array.isArray(alert.affectedVersions) ? alert.affectedVersions : null,
        sourceUrl: alert.sourceUrl,

        isProcessed: true,
        processingState: 'enriched',
        enrichmentVersion: 3,
        updatedAt: new Date().toISOString(),
      };

      await updateAlert(alert.id, alert.sourceId, cosmosUpdate);
      successCount++;

      if (i < alerts.length - 1) {
        await sleep(500);
      }

      if ((i + 1) % batchSize === 0 && i < alerts.length - 1) {
        await sleep(batchPauseMs);
      }
    } catch (error: any) {
      failedCount++;
      errors.push({ alertId: alert.id, error: error?.message || String(error) });
      console.error(`[${runId}] Re-enrich V3 failed: ${alert.id}:`, error?.message || error);
    }
  }

  const result = buildResult(runId, startedAt, attemptedCount, successCount, failedCount, skippedCount, totalTokens, errors);
  await logEnrichmentRun(result, 'manual', { type: 're-enrichment', pipelineSourceId: 're-enrichment-v3-pipeline' });

  console.log(
    `[${runId}] Re-enrichment V3 complete. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}, Tokens: ${totalTokens}`
  );

  return result;
}

function buildResult(
  runId: string,
  startedAt: Date,
  totalProcessed: number,
  totalSuccess: number,
  totalFailed: number,
  totalSkipped: number,
  totalTokensUsed: number,
  errors: { alertId: string; error: string }[]
): EnrichmentRunResult {
  const completedAt = new Date();
  return {
    runId,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalProcessed,
    totalSuccess,
    totalFailed,
    totalSkipped,
    totalTokensUsed,
    estimatedCostUSD: estimateCost(totalTokensUsed),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    errors,
  };
}


