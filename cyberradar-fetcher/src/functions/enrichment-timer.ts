// © 2025 CyberLage
/**
 * Enrichment Timer Trigger
 * Runs 30 minutes after each fetch cycle (every 6 hours).
 * Schedule: "0 30 every-6h * * *" (at :30 past 0, 6, 12, 18 UTC)
 */

import { app, Timer, InvocationContext } from '@azure/functions';
import { runEnrichment } from '../enrichment/enrichmentOrchestrator';

async function enrichmentTimerHandler(timer: Timer, context: InvocationContext): Promise<void> {
  context.log('Enrichment timer triggered.');

  try {
    const result = await runEnrichment({
      maxAlerts: 100,
      source: 'timer',
    });

    context.log(
      `Enrichment complete: ${result.totalSuccess} success, ${result.totalFailed} failed, ${result.totalSkipped} skipped, ${result.totalTokensUsed} tokens (~$${result.estimatedCostUSD.toFixed(3)})`
    );
  } catch (error: any) {
    context.error('Enrichment timer failed:', error);
  }
}

app.timer('EnrichmentTimer', {
  schedule: '0 30 */6 * * *',
  handler: enrichmentTimerHandler,
});


