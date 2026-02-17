#!/usr/bin/env node
const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || "cyberradar";
const containerId = process.env.COSMOS_CONTAINER || "raw_alerts";

if (!endpoint || !key) {
  console.error("COSMOS_ENDPOINT/COSMOS_KEY are required.");
  process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const container = client.database(databaseId).container(containerId);

const now = new Date();
const iso = now.toISOString();

function sampleAlert(overrides) {
  return {
    id: crypto.randomUUID(),
    sourceId: "bsi-cert",
    sourceName: "BSI CERT-Bund",
    title: "Critical vulnerability in VPN gateway",
    titleDe: "Critical vulnerability in VPN gateway",
    description: "A critical vulnerability allows remote code execution.",
    summary: "Critical VPN vulnerability with possible RCE.",
    summaryDe: "Critical VPN vulnerability with possible RCE.",
    publishedAt: iso,
    fetchedAt: iso,
    severity: "high",
    aiScore: 92,
    isProcessed: true,
    alertType: "vulnerability",
    cveIds: ["CVE-2025-12345"],
    isActivelyExploited: true,
    isZeroDay: false,
    compliance: {
      nis2: {
        relevant: "yes",
        confidence: "medium",
        references: ["§30 BSIG", "§32 BSIG"],
        reasoning: "Critical vulnerability with potential impact on critical infrastructure.",
        reportingRequired: true,
        reportingDeadlineHours: 24,
        actionItemsDe: ["Patch the VPN gateway immediately."],
      },
      dora: {
        relevant: "conditional",
        confidence: "low",
        references: ["Art. 17 DORA"],
        reasoning: "Relevance depends on whether the organization operates in the financial sector.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: ["Verify affected systems in financial-sector operations."],
      },
      gdpr: {
        relevant: "no",
        confidence: "low",
        references: ["Art. 32 GDPR"],
        reasoning: "No clear personal-data impact identified.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: [],
      },
    },
    ...overrides,
  };
}

const samples = [
  sampleAlert({
    sourceId: "cisa-kev",
    sourceName: "CISA KEV",
    title: "Actively exploited vulnerability in web server",
    titleDe: "Actively exploited vulnerability in web server",
    severity: "critical",
    aiScore: 97,
    cveIds: ["CVE-2025-7777"],
  }),
  sampleAlert({
    sourceId: "nvd",
    sourceName: "NVD",
    title: "Medium vulnerability in library",
    titleDe: "Medium vulnerability in library",
    severity: "medium",
    aiScore: 65,
    isActivelyExploited: false,
    cveIds: ["CVE-2025-4242"],
    compliance: {
      nis2: {
        relevant: "no",
        confidence: "low",
        references: [],
        reasoning: "No indicators of relevance.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: [],
      },
      dora: {
        relevant: "no",
        confidence: "low",
        references: [],
        reasoning: "No indicators of relevance.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: [],
      },
      gdpr: {
        relevant: "no",
        confidence: "low",
        references: [],
        reasoning: "No data impact identified.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: [],
      },
    },
  }),
  sampleAlert({
    sourceId: "microsoft",
    sourceName: "Microsoft Security",
    title: "Security update for Exchange",
    titleDe: "Security update for Exchange",
    severity: "high",
    aiScore: 88,
    isZeroDay: false,
  }),
];

(async () => {
  for (const doc of samples) {
    await container.items.upsert(doc);
  }
  console.log(`Seed completed: ${samples.length} demo alerts in ${containerId}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});

