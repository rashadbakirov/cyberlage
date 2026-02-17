// © 2025 CyberLage
/**
 * Manual Re-Enrichment V3 HTTP Trigger
 *
 * POST /api/reEnrichV3                      → re-enrich alerts to v3 (time-budgeted)
 * POST /api/reEnrichV3?limit=50             → re-enrich 50 alerts
 * POST /api/reEnrichV3?source=bsi-cert      → re-enrich only one sourceId
 * POST /api/reEnrichV3?missingCsaf=true     → only BSI alerts missing CSAF detail
 * POST /api/reEnrichV3?maxSeconds=200       → stop early after time budget (default: 200s)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { runReEnrichmentV3 } from '../enrichment/enrichmentOrchestrator';

function readBool(value: string | null): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

async function reEnrichV3Handler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Manual re-enrichment V3 requested.');

  const limitParam = request.query.get('limit');
  const sourceId = request.query.get('source') || undefined;
  const missingCsaf = readBool(request.query.get('missingCsaf'));
  const forceAll = readBool(request.query.get('forceAll'));

  const maxSecondsParam = request.query.get('maxSeconds');
  const maxSeconds = maxSecondsParam ? Number.parseInt(maxSecondsParam, 10) : 200;
  const maxDurationMs = Number.isFinite(maxSeconds) && maxSeconds > 0 ? maxSeconds * 1000 : undefined;

  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    const result = await runReEnrichmentV3({
      limit: Number.isFinite(limit as any) ? limit : undefined,
      sourceId,
      missingCsaf,
      forceAll,
      maxDurationMs,
    });

    return {
      status: 200,
      jsonBody: {
        ok: true,
        ...result,
      },
    };
  } catch (error: any) {
    context.error('Manual re-enrichment V3 failed:', error);

    return {
      status: 500,
      jsonBody: {
        ok: false,
        error: error?.message ?? String(error),
      },
    };
  }
}

app.http('ReEnrichV3', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'reEnrichV3',
  handler: reEnrichV3Handler,
});



