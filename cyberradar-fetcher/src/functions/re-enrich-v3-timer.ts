// © 2025 CyberLage
/**
 * Re-Enrichment V3 Timer Trigger
 *
 * Backfills `enrichmentVersion=3` for existing alerts in small batches.
 * This avoids long-running HTTP requests and lets the pipeline complete over the next hours.
 *
 * Defaults:
 * - every 10 minutes
 * - up to 10 alerts per run
 * - stop after ~9 minutes (to stay below function timeout)
 *
 * Optional env overrides:
 * - REENRICH_V3_TIMER_ENABLED=true|false
 * - REENRICH_V3_TIMER_SCHEDULE (cron with seconds, e.g. every 10 minutes)
 * - REENRICH_V3_TIMER_LIMIT=10
 * - REENRICH_V3_TIMER_MAX_SECONDS=540
 * - REENRICH_V3_TIMER_SOURCE_ID=bsi-cert
 * - REENRICH_V3_TIMER_MISSING_CSAF_ONLY=true|false
 */

import { app, InvocationContext, Timer } from '@azure/functions';
import { runReEnrichmentV3 } from '../enrichment/enrichmentOrchestrator';

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true' || raw === '1' || raw.toLowerCase() === 'yes';
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Default disabled once backfill is complete. Enable explicitly via app setting when needed.
const ENABLED = readBool('REENRICH_V3_TIMER_ENABLED', false);
const SCHEDULE = process.env.REENRICH_V3_TIMER_SCHEDULE || '0 */10 * * * *';
const LIMIT = readInt('REENRICH_V3_TIMER_LIMIT', 10);
const MAX_SECONDS = readInt('REENRICH_V3_TIMER_MAX_SECONDS', 540); // ~9 minutes
const SOURCE_ID = process.env.REENRICH_V3_TIMER_SOURCE_ID || undefined;
const MISSING_CSAF_ONLY = readBool('REENRICH_V3_TIMER_MISSING_CSAF_ONLY', false);

async function reEnrichV3TimerHandler(timer: Timer, context: InvocationContext): Promise<void> {
  if (!ENABLED) {
    context.log('Re-enrichment V3 timer disabled (REENRICH_V3_TIMER_ENABLED=false).');
    return;
  }

  const limit = LIMIT > 0 ? LIMIT : 10;
  const maxDurationMs = Math.max(60, MAX_SECONDS) * 1000;

  if (timer.isPastDue) {
    context.log('Re-enrichment V3 timer is running late (past due).');
  }

  context.log('Re-enrichment V3 timer triggered.', {
    limit,
    maxSeconds: Math.round(maxDurationMs / 1000),
    sourceId: SOURCE_ID || 'ALL',
    missingCsafOnly: MISSING_CSAF_ONLY,
  });

  try {
    const result = await runReEnrichmentV3({
      limit,
      sourceId: SOURCE_ID,
      missingCsaf: MISSING_CSAF_ONLY,
      maxDurationMs,
    });

    context.log(
      `Re-enrichment V3 complete: processed=${result.totalProcessed} success=${result.totalSuccess} failed=${result.totalFailed} skipped=${result.totalSkipped} tokens=${result.totalTokensUsed} (~$${result.estimatedCostUSD.toFixed(
        3
      )})`
    );
  } catch (error: any) {
    context.error('Re-enrichment V3 timer failed:', error);
  }
}

app.timer('ReEnrichV3Timer', {
  schedule: SCHEDULE,
  handler: reEnrichV3TimerHandler,
});


