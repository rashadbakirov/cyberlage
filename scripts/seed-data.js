#!/usr/bin/env node
const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || "cyberradar";
const containerId = process.env.COSMOS_CONTAINER || "raw_alerts";

if (!endpoint || !key) {
  console.error("COSMOS_ENDPOINT/COSMOS_KEY fehlen.");
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
    title: "Kritische Schwachstelle in VPN-Gateway",
    titleDe: "Kritische Schwachstelle in VPN-Gateway",
    description: "Eine kritische Schwachstelle erlaubt Remote Code Execution.",
    summary: "Kritische VPN-Schwachstelle mit möglicher RCE.",
    summaryDe: "Kritische VPN-Schwachstelle mit möglicher RCE.",
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
        reasoning: "Kritische Schwachstelle in kritischer Infrastruktur moeglich.",
        reportingRequired: true,
        reportingDeadlineHours: 24,
        actionItemsDe: ["Patchen Sie das VPN-Gateway umgehend."],
      },
      dora: {
        relevant: "conditional",
        confidence: "low",
        references: ["Art. 17 DORA"],
        reasoning: "Relevanz abhaengig von Finanzsektor-Betrieb.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: ["Betroffene Systeme im Finanzbereich pruefen."],
      },
      gdpr: {
        relevant: "no",
        confidence: "low",
        references: ["Art. 32 DSGVO"],
        reasoning: "Kein klarer Datenbezug erkennbar.",
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
    title: "Ausgenutzte Schwachstelle in Webserver",
    titleDe: "Ausgenutzte Schwachstelle in Webserver",
    severity: "critical",
    aiScore: 97,
    cveIds: ["CVE-2025-7777"],
  }),
  sampleAlert({
    sourceId: "nvd",
    sourceName: "NVD",
    title: "Mittlere Schwachstelle in Library",
    titleDe: "Mittlere Schwachstelle in Library",
    severity: "medium",
    aiScore: 65,
    isActivelyExploited: false,
    cveIds: ["CVE-2025-4242"],
    compliance: {
      nis2: {
        relevant: "no",
        confidence: "low",
        references: [],
        reasoning: "Keine Hinweise auf Relevanz.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: [],
      },
      dora: {
        relevant: "no",
        confidence: "low",
        references: [],
        reasoning: "Keine Hinweise auf Relevanz.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: [],
      },
      gdpr: {
        relevant: "no",
        confidence: "low",
        references: [],
        reasoning: "Kein Datenbezug erkennbar.",
        reportingRequired: false,
        reportingDeadlineHours: null,
        actionItemsDe: [],
      },
    },
  }),
  sampleAlert({
    sourceId: "microsoft",
    sourceName: "Microsoft Security",
    title: "Sicherheitsupdate fuer Exchange",
    titleDe: "Sicherheitsupdate fuer Exchange",
    severity: "high",
    aiScore: 88,
    isZeroDay: false,
  }),
];

(async () => {
  for (const doc of samples) {
    await container.items.upsert(doc);
  }
  console.log(`Seed abgeschlossen: ${samples.length} Demo-Alerts in ${containerId}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
