// © 2025 CyberLage
/**
 * Manual Enrichment HTTP Trigger
 * POST /api/manual/enrich           → Process up to 50 unprocessed alerts
 * POST /api/manual/enrich?limit=10  → Process 10 alerts
 * POST /api/manual/enrich?id=xxx    → Process single alert by ID
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { runEnrichment } from '../enrichment/enrichmentOrchestrator';

async function manualEnrichHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Manual enrichment requested.');

  const limitParam = request.query.get('limit');
  const alertId = request.query.get('id');
  const limit = alertId ? 1 : parseInt(limitParam || '50', 10);

  try {
    const result = await runEnrichment({
      maxAlerts: limit,
      alertId: alertId || undefined,
      source: 'manual',
    });

    return {
      status: 200,
      jsonBody: {
        ok: true,
        ...result,
      },
    };
  } catch (error: any) {
    context.error('Manual enrichment failed:', error);

    return {
      status: 500,
      jsonBody: {
        ok: false,
        error: error?.message ?? String(error),
      },
    };
  }
}

app.http('ManualEnrich', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'manual/enrich',
  handler: manualEnrichHandler,
});


