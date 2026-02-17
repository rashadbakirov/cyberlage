// © 2025 CyberLage
// Cosmos DB Zugriff
import { Container } from "@azure/cosmos";
import type { SqlParameter } from "@azure/cosmos";
import type { Alert, PortalStatsResponse } from "@/types/alert";
import { categorizeAlert } from "@/lib/topics";
import { parseIsoDate } from "@/lib/utils";
import { getContainer } from "@/lib/cosmos-router";

// cosmos-router für intelligentes Routing zwischen Prod-/Dev-Datenbanken
// - Produktions-Container (raw_alerts, source_registry, etc.) → Prod-DB
// - Dev-Container (users, tenants, etc.) → Dev-DB

export function getAlertsContainer(): Container {
  return getContainer("raw_alerts");
}

export function getTenantsContainer(): Container {
  // Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
  throw new Error("Mandanten-Container ist in der Public-Version deaktiviert.");
}

export function getTenantAssetsContainer(): Container {
  // Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
  throw new Error("Mandanten-Assets sind in der Public-Version deaktiviert.");
}

export function getTenantIncidentsContainer(): Container {
  // Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
  throw new Error("Mandanten-Vorfälle sind in der Public-Version deaktiviert.");
}

export function getAlertMatchesContainer(): Container {
  // Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
  throw new Error("Mandanten-Matching ist in der Public-Version deaktiviert.");
}

export function getCsafContainer(): Container {
  return getContainer("csaf");
}

export function getUsersContainer(): Container {
  return getContainer("users");
}

function normalizeSeverityList(severity?: string | string[] | null): string[] | null {
  if (!severity) return null;
  const list = Array.isArray(severity) ? severity : String(severity).split(",");
  const cleaned = list
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .filter(s => ["critical", "high", "medium", "low", "info"].includes(s));
  return cleaned.length ? cleaned : null;
}

function normalizeStringList(value?: string | string[] | null): string[] | null {
  if (!value) return null;
  const list = Array.isArray(value) ? value : String(value).split(",");
  const cleaned = list.map(s => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

function normalizeSortBy(sortBy?: string): "score" | "date" | "severity" {
  const key = (sortBy || "").trim().toLowerCase();
  if (key === "date" || key === "publishedat") return "date";
  if (key === "severity") return "severity";
  return "score";
}

function safeIso(value: string | undefined): string | null {
  if (!value) return null;
  const date = parseIsoDate(value);
  return date ? date.toISOString() : null;
}

// Fetch alerts with pagination, filtering, sorting
export async function queryAlerts(options: {
  page?: number;
  pageSize?: number;
  severity?: string | string[];
  source?: string | string[];
  alertType?: string | string[];
  topic?: string | string[];
  compliance?: string | string[];
  reportingOnly?: boolean;
  exploitedOnly?: boolean;
  search?: string;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
  from?: string;
  to?: string;
}): Promise<{ alerts: Alert[]; total: number }> {
  const container = getAlertsContainer();
  const page = options.page || 1;
  const pageSize = Math.min(options.pageSize || 25, 100);
  const offset = Math.max(0, (page - 1) * pageSize);

  // Build WHERE clauses
  const conditions: string[] = [];
  const params: SqlParameter[] = [];

  // Only show enriched alerts in the portal
  conditions.push("c.isProcessed = true");

  const severities = normalizeSeverityList(options.severity);
  if (severities) {
    const ors: string[] = [];
    severities.forEach((sev, i) => {
      const name = `@sev${i}`;
      ors.push(`(IS_DEFINED(c.severity) AND LOWER(c.severity) = ${name})`);
      params.push({ name, value: sev });
    });
    conditions.push(`(${ors.join(" OR ")})`);
  }

  const sources = normalizeStringList(options.source);
  if (sources) {
    const ors: string[] = [];
    sources.forEach((src, i) => {
      const name = `@src${i}`;
      ors.push(`(c.sourceId = ${name} OR c.sourceName = ${name})`);
      params.push({ name, value: src });
    });
    conditions.push(`(${ors.join(" OR ")})`);
  }

  const types = normalizeStringList(options.alertType);
  if (types) {
    const ors: string[] = [];
    types.forEach((type, i) => {
      const name = `@type${i}`;
      ors.push(`c.alertType = ${name}`);
      params.push({ name, value: type });
    });
    conditions.push(`(${ors.join(" OR ")})`);
  }

  if (options.exploitedOnly) {
    conditions.push("c.isActivelyExploited = true");
  }

  const searchRaw = (options.search || "").trim();
  if (searchRaw) {
    const name = "@search";
    const cveMatch = searchRaw.match(/CVE-\\d{4}-\\d{4,7}/i);

    const searchOrs: string[] = [
      `CONTAINS(c.title, ${name}, true)`,
      "(IS_DEFINED(c.titleDe) AND CONTAINS(c.titleDe, @search, true))",
      "(IS_DEFINED(c.summaryDe) AND CONTAINS(c.summaryDe, @search, true))",
      "(IS_DEFINED(c.summary) AND CONTAINS(c.summary, @search, true))",
      `CONTAINS(c.description, ${name}, true)`,
    ];

    if (cveMatch) {
      const cveName = "@cve";
      searchOrs.push(`(IS_DEFINED(c.cveIds) AND ARRAY_CONTAINS(c.cveIds, ${cveName}))`);
      params.push({ name: cveName, value: cveMatch[0].toUpperCase() });
    }

    params.push({ name, value: searchRaw });
    conditions.push(`(${searchOrs.join(" OR ")})`);
  }

  // Time range: use publishedAt; fall back to fetchedAt when missing
  const fromIso = safeIso(options.from || undefined);
  const toIso = safeIso(options.to || undefined);
  if (fromIso) {
    conditions.push(
      "((IS_DEFINED(c.publishedAt) AND c.publishedAt >= @from) OR (((NOT IS_DEFINED(c.publishedAt)) OR IS_NULL(c.publishedAt) OR c.publishedAt = '') AND c.fetchedAt >= @from))"
    );
    params.push({ name: "@from", value: fromIso });
  }
  if (toIso) {
    conditions.push(
      "((IS_DEFINED(c.publishedAt) AND c.publishedAt < @to) OR (((NOT IS_DEFINED(c.publishedAt)) OR IS_NULL(c.publishedAt) OR c.publishedAt = '') AND c.fetchedAt < @to))"
    );
    params.push({ name: "@to", value: toIso });
  }

  const frameworks = normalizeStringList(options.compliance)?.map(f => f.toLowerCase());
  if (frameworks && frameworks.length > 0) {
    const ors: string[] = [];
    for (const f of frameworks) {
      if (f === "nis2") {
        ors.push(
          "(IS_DEFINED(c.compliance) AND IS_DEFINED(c.compliance.nis2) AND NOT IS_NULL(c.compliance.nis2) AND c.compliance.nis2.relevant != 'no')"
        );
      }
      if (f === "dora") {
        ors.push(
          "(IS_DEFINED(c.compliance) AND IS_DEFINED(c.compliance.dora) AND NOT IS_NULL(c.compliance.dora) AND c.compliance.dora.relevant != 'no')"
        );
      }
      if (f === "gdpr") {
        ors.push(
          "(IS_DEFINED(c.compliance) AND IS_DEFINED(c.compliance.gdpr) AND NOT IS_NULL(c.compliance.gdpr) AND c.compliance.gdpr.relevant != 'no')"
        );
      }
    }
    if (ors.length > 0) {
      conditions.push(`(${ors.join(" OR ")})`);
    }
  }

  if (options.reportingOnly) {
    conditions.push(
      "((IS_DEFINED(c.compliance) AND IS_DEFINED(c.compliance.nis2) AND IS_DEFINED(c.compliance.nis2.reportingRequired) AND c.compliance.nis2.reportingRequired = true) OR (IS_DEFINED(c.compliance) AND IS_DEFINED(c.compliance.dora) AND IS_DEFINED(c.compliance.dora.reportingRequired) AND c.compliance.dora.reportingRequired = true) OR (IS_DEFINED(c.compliance) AND IS_DEFINED(c.compliance.gdpr) AND IS_DEFINED(c.compliance.gdpr.reportingRequired) AND c.compliance.gdpr.reportingRequired = true))"
    );
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortBy = normalizeSortBy(options.sortBy);
  const sortDir = options.sortDir === "ASC" ? "ASC" : "DESC";
  const orderExpr =
    sortBy === "date"
      ? "c.publishedAt"
      : sortBy === "severity"
        ? "c.severity"
        : "c.aiScore";

  const dataQuery = `SELECT * FROM c ${whereClause} ORDER BY ${orderExpr} ${sortDir}`;
  const { resources } = await container.items.query<Alert>({ query: dataQuery, parameters: params }).fetchAll();

  // Topic filtering is computed in code (not stored in DB)
  const topicIds = normalizeStringList(options.topic)?.map(t => t.toLowerCase());
  const filtered = topicIds && topicIds.length > 0
    ? resources.filter(alert => {
        const topics = categorizeAlert({
          title: alert.titleDe || alert.title,
          affectedProducts: alert.affectedProducts || [],
          affectedVendors: alert.affectedVendors || [],
          alertType: alert.alertType,
          sourceName: alert.sourceName,
        });
        return topicIds.some(t => topics.includes(t));
      })
    : resources;

  const total = filtered.length;
  const alerts = filtered.slice(offset, offset + pageSize);
  return { alerts, total };
}

// Get single alert by ID
export async function getAlertById(id: string): Promise<Alert | null> {
  const container = getAlertsContainer();
  const query = "SELECT * FROM c WHERE c.id = @id";
  const { resources } = await container.items
    .query<Alert>({ query, parameters: [{ name: "@id", value: id }] })
    .fetchAll();
  return resources[0] || null;
}

export async function getPortalStats(options: { from: string; to: string }): Promise<PortalStatsResponse> {
  const { alerts } = await queryAlerts({
    page: 1,
    pageSize: 5000,
    from: options.from,
    to: options.to,
    sortBy: "score",
    sortDir: "DESC",
  });

  const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const bySource: Record<string, number> = {};
  const byTopic: Record<string, number> = {};

  let activelyExploited = 0;
  let zeroDays = 0;

  const compliance = {
    nis2: { yes: 0, conditional: 0, reportingRequired: 0 },
    dora: { yes: 0, conditional: 0, reportingRequired: 0 },
    gdpr: { yes: 0, conditional: 0, reportingRequired: 0 },
  };

  for (const alert of alerts) {
    const sev = (alert.severity || "unknown").toString().toLowerCase();
    if (sev in bySeverity) bySeverity[sev] += 1;

    bySource[alert.sourceName || alert.sourceId || "Unbekannt"] =
      (bySource[alert.sourceName || alert.sourceId || "Unbekannt"] || 0) + 1;

    const topics = categorizeAlert({
      title: alert.titleDe || alert.title,
      affectedProducts: alert.affectedProducts || [],
      affectedVendors: alert.affectedVendors || [],
      alertType: alert.alertType,
      sourceName: alert.sourceName,
    });
    for (const t of topics) {
      byTopic[t] = (byTopic[t] || 0) + 1;
    }

    if (alert.isActivelyExploited) activelyExploited += 1;
    if (alert.isZeroDay) zeroDays += 1;

    const c = alert.compliance;
    for (const key of ["nis2", "dora", "gdpr"] as const) {
      const tag = c?.[key];
      if (!tag) continue;
      if (tag.relevant === "yes") compliance[key].yes += 1;
      if (tag.relevant === "conditional") compliance[key].conditional += 1;
      if (tag.reportingRequired) compliance[key].reportingRequired += 1;
    }
  }

  const urgentAlerts = alerts
    .filter(a => a.isActivelyExploited || a.isZeroDay || (typeof a.aiScore === "number" && a.aiScore >= 90))
    .slice(0, 5);

  const sources = Object.entries(bySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAlerts: alerts.length,
    bySeverity: {
      critical: bySeverity.critical || 0,
      high: bySeverity.high || 0,
      medium: bySeverity.medium || 0,
      low: bySeverity.low || 0,
      info: bySeverity.info || 0,
    },
    activelyExploited,
    zeroDays,
    byTopic,
    bySource: sources,
    compliance,
    urgentAlerts,
    recentAlerts: alerts.slice(0, 10),
  };
}


