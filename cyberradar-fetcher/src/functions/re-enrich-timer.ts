// © 2025 CyberLage
/**
 * Re-Enrichment Timer Trigger
 *
 * Backfills `enrichmentVersion=2` for existing alerts in small batches.
 * This avoids long-running HTTP requests and lets the pipeline complete over the next hours.
 *
 * Defaults:
 * - every 5 minutes
 * - up to 10 alerts per run
 * - stop after ~9 minutes (to stay below function timeout)
 *
 * Optional env overrides:
 * - REENRICH_TIMER_ENABLED=true|false
 * - REENRICH_TIMER_SCHEDULE (cron with seconds, e.g. every 5 minutes)
 * - REENRICH_TIMER_LIMIT=10
 * - REENRICH_TIMER_MAX_SECONDS=540
 */

import { app, InvocationContext, Timer } from '@azure/functions';
import { runReEnrichment } from '../enrichment/enrichmentOrchestrator';

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
const ENABLED = readBool('REENRICH_TIMER_ENABLED', false);
const SCHEDULE = process.env.REENRICH_TIMER_SCHEDULE || '0 */5 * * * *';
const LIMIT = readInt('REENRICH_TIMER_LIMIT', 10);
const MAX_SECONDS = readInt('REENRICH_TIMER_MAX_SECONDS', 540); // ~9 minutes

async function reEnrichTimerHandler(timer: Timer, context: InvocationContext): Promise<void> {
  if (!ENABLED) {
    context.log('Re-enrichment timer disabled (REENRICH_TIMER_ENABLED=false).');
    return;
  }

  const limit = LIMIT > 0 ? LIMIT : 10;
  const maxDurationMs = Math.max(60, MAX_SECONDS) * 1000;

  if (timer.isPastDue) {
    context.log('Re-enrichment timer is running late (past due).');
  }

  context.log('Re-enrichment timer triggered.', {
    limit,
    maxSeconds: Math.round(maxDurationMs / 1000),
  });

  try {
    const result = await runReEnrichment({
      limit,
      maxDurationMs,
    });

    context.log(
      `Re-enrichment complete: processed=${result.totalProcessed} success=${result.totalSuccess} failed=${result.totalFailed} skipped=${result.totalSkipped} tokens=${result.totalTokensUsed} (~$${result.estimatedCostUSD.toFixed(
        3
      )})`
    );
  } catch (error: any) {
    context.error('Re-enrichment timer failed:', error);
  }
}

app.timer('ReEnrichTimer', {
  schedule: SCHEDULE,
  handler: reEnrichTimerHandler,
});


