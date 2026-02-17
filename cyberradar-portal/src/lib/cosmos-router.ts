// © 2025 CyberLage
import { CosmosClient, Database, Container } from "@azure/cosmos";

// Vereinfachter Cosmos-Zugriff (Single-Tenant/Demo-Modus)
const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseName = process.env.COSMOS_DATABASE || "cyberradar";

const client = new CosmosClient({ endpoint, key });

export function getDatabase(_containerName?: string): Database {
  return client.database(databaseName);
}

export function getContainer(containerName: string): Container {
  return client.database(databaseName).container(containerName);
}

export function isReadOnly(): boolean {
  return false;
}

export function getRoutingInfo() {
  return {
    databaseName,
    environment: process.env.NODE_ENV,
  };
}

export default {
  getDatabase,
  getContainer,
  isReadOnly,
  getRoutingInfo,
};


