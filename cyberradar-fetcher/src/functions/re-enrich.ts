// © 2025 CyberLage
/**
 * Manual Re-Enrichment HTTP Trigger
 *
 * POST /api/reEnrich                    → re-enrich ALL alerts
 * POST /api/reEnrich?limit=50           → re-enrich 50 alerts
 * POST /api/reEnrich?source=bsi-cert    → re-enrich only one sourceId
 * POST /api/reEnrich?missingOnly=true   → only alerts missing severity/CVSS/EPSS
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { runReEnrichment } from '../enrichment/enrichmentOrchestrator';

async function reEnrichHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Manual re-enrichment requested.');

 const limitParam = request.query.get('limit');
  const sourceId = request.query.get('source') || undefined;
  const missingOnly = (request.query.get('missingOnly') || '').toLowerCase() === 'true';
  const forceAll = (request.query.get('forceAll') || '').toLowerCase() === 'true';

  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const result = await runReEnrichment({
      limit: Number.isFinite(limit as any) ? limit : undefined,
      sourceId,
      missingOnly,
      forceAll,
    });

    return {
      status: 200,
      jsonBody: {
        ok: true,
        ...result,
      },
    };
  } catch (error: any) {
    context.error('Manual re-enrichment failed:', error);

    return {
      status: 500,
      jsonBody: {
        ok: false,
        error: error?.message ?? String(error),
      },
    };
  }
}

app.http('ReEnrich', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'reEnrich',
  handler: reEnrichHandler,
});


