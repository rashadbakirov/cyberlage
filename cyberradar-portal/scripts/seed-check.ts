// © 2025 CyberLage
// scripts/seed-check.ts
// Run with: npx tsx scripts/seed-check.ts

import { CosmosClient } from "@azure/cosmos";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Testing Cosmos DB connection...\n");

  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT!,
    key: process.env.COSMOS_KEY!,
  });

  const db = client.database(process.env.COSMOS_DATABASE!);
  const container = db.container("raw_alerts");

  // Count total alerts
  const { resources: countResult } = await container.items
    .query("SELECT VALUE COUNT(1) FROM c")
    .fetchAll();
  console.log(`Total alerts: ${countResult[0]}`);

  // Count by severity
  const { resources: severities } = await container.items
    .query("SELECT c.severity, COUNT(1) as cnt FROM c GROUP BY c.severity")
    .fetchAll();
  console.log("\nBy severity:");
  for (const s of severities) {
    console.log(`   ${s.severity}: ${s.cnt}`);
  }

  // Check enrichment
  const { resources: enriched } = await container.items
    .query("SELECT VALUE COUNT(1) FROM c WHERE c.isProcessed = true")
    .fetchAll();
  console.log(`\nAI-enriched: ${enriched[0]}`);

  // Check German translations
  const { resources: german } = await container.items
    .query("SELECT VALUE COUNT(1) FROM c WHERE c.titleDe != null")
    .fetchAll();
  console.log(`German translations: ${german[0]}`);

  // Sample one alert
  const { resources: sample } = await container.items
    .query("SELECT TOP 1 * FROM c WHERE c.severity = 'CRITICAL' ORDER BY c.aiScore DESC")
    .fetchAll();
  if (sample[0]) {
    console.log("\nSample CRITICAL alert:");
    console.log(`   Title: ${sample[0].title}`);
    console.log(`   TitleDe: ${sample[0].titleDe}`);
    console.log(`   Score: ${sample[0].aiScore}`);
    console.log(`   CVEs: ${sample[0].cveIds?.join(", ")}`);
  }

  console.log("\nConnection test passed! Portal can access all data.\n");
}

main().catch(console.error);


