// © 2025 CyberLage
import { runReEnrichment } from '../enrichment/enrichmentOrchestrator';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main(): Promise<void> {
  const batchLimit = readIntEnv('REENRICH_BATCH_LIMIT', 50);
  const sleepSeconds = readIntEnv('REENRICH_SLEEP_SECONDS', 3);
  const maxBatches = process.env.REENRICH_MAX_BATCHES
    ? readIntEnv('REENRICH_MAX_BATCHES', 0)
    : null;

  console.log(
    `Direct re-enrichment starting. batchLimit=${batchLimit} sleepSeconds=${sleepSeconds} maxBatches=${
      maxBatches ?? 'none'
    }`
  );

  let batch = 0;
  let totalProcessed = 0;
  let totalTokens = 0;
  let totalCost = 0;

  while (true) {
    batch++;
    const started = Date.now();

    const result = await runReEnrichment({ limit: batchLimit });

    const durationSeconds = Math.round((Date.now() - started) / 1000);

    totalProcessed += result.totalProcessed;
    totalTokens += result.totalTokensUsed;
    totalCost += result.estimatedCostUSD;

    console.log(
      `batch ${batch}: processed=${result.totalProcessed} success=${result.totalSuccess} failed=${result.totalFailed} skipped=${result.totalSkipped} tokens=${result.totalTokensUsed} cost=$${result.estimatedCostUSD.toFixed(
        4
      )} duration=${durationSeconds}s runId=${result.runId}`
    );

    if (result.totalProcessed === 0) break;
    if (maxBatches !== null && maxBatches > 0 && batch >= maxBatches) break;

    await sleep(sleepSeconds * 1000);
  }

  console.log(
    `DONE: totalProcessed=${totalProcessed} totalTokens=${totalTokens} approxCostUSD=$${totalCost.toFixed(
      4
    )} batches=${batch}`
  );
}

main().catch(err => {
  console.error('Direct re-enrichment failed:', err);
  process.exit(1);
});



