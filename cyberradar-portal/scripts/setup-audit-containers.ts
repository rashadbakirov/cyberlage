// © 2025 CyberLage
// scripts/setup-audit-containers.ts
// Run with: npx tsx scripts/setup-audit-containers.ts

import { CosmosClient } from "@azure/cosmos";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Setting up Cosmos DB audit containers...\n");

  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT!,
    key: process.env.COSMOS_KEY!,
  });

  const dbName = process.env.COSMOS_DATABASE || "cyberradar";
  const db = client.database(dbName);

  console.log("Creating alert_actions container...");
  await db.containers.createIfNotExists({
    id: "alert_actions",
    partitionKey: { paths: ["/alertId"] },
    defaultTtl: -1, // Never expire — audit evidence
  });

  console.log("Creating alert_status container...");
  await db.containers.createIfNotExists({
    id: "alert_status",
    partitionKey: { paths: ["/alertId"] },
  });

  console.log("\n✅ Containers created successfully");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});



