// © 2025 CyberLage
/**
 * Manual HTTP trigger to run a fetch cycle on-demand.
 *
 * Useful for validation, troubleshooting, and initial seeding.
 * Auth level is "function" (requires a function key).
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { runFetchCycle } from '../orchestrator';

export async function manualFetch(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Manual fetch requested.');

  try {
    const result = await runFetchCycle();

    return {
      status: 200,
      jsonBody: {
        ok: true,
        ...result,
      },
    };
  } catch (error: any) {
    context.error('Manual fetch failed:', error);

    return {
      status: 500,
      jsonBody: {
        ok: false,
        error: error?.message ?? String(error),
      },
    };
  }
}

app.http('ManualFetch', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'manual/fetch',
  handler: manualFetch,
});


