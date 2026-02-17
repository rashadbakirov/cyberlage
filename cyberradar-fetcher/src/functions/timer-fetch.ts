// © 2025 CyberLage
/**
 * Azure Function Timer Trigger - Fetch Cyber Alerts
 * Runs every 10 minutes.
 *
 * Source-specific throttling is handled in the orchestrator via `source_registry.lastFetchAt`
 * and per-source `defaultFetchIntervalSeconds`.
 */

import { app, InvocationContext, Timer } from '@azure/functions';
import { runFetchCycle } from '../orchestrator';

export async function timerTriggerFetch(myTimer: Timer, context: InvocationContext): Promise<void> {
  const timestamp = new Date().toISOString();

  if (myTimer.isPastDue) {
    context.log('Timer function is running late!');
  }

  context.log('CyberRadar fetch cycle starting at:', timestamp);

  try {
    const result = await runFetchCycle();

    context.log('Fetch cycle completed successfully:', {
      runId: result.runId,
      totalFetched: result.totalFetched,
      totalNew: result.totalNew,
      totalDuplicate: result.totalDuplicate,
      totalErrors: result.totalErrors,
    });

    // Track custom metrics in Application Insights
    context.log('Metric - AlertsFetched:', result.totalFetched);
    context.log('Metric - AlertsNew:', result.totalNew);
    context.log('Metric - AlertsDuplicate:', result.totalDuplicate);
    context.log('Metric - FetchErrors:', result.totalErrors);
  } catch (error: any) {
    context.error('Fetch cycle failed:', error);
    throw error; // Re-throw to mark function as failed
  }
}

app.timer('TimerTriggerFetch', {
  schedule: '0 */10 * * * *',
  handler: timerTriggerFetch
});


