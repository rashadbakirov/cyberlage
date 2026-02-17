// © 2025 CyberLage
import { NextRequest, NextResponse } from "next/server";
import { queryAlerts, getAlertById, getAlertsContainer } from "@/lib/cosmos";
import { resolveTimeRange } from "@/lib/timeRange";
import { TOPICS, categorizeAlert } from "@/lib/topics";
import { searchAlerts } from "@/lib/search";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type Framework = "nis2" | "dora" | "gdpr";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function jsonRpcResult(id: JsonRpcId | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function jsonRpcError(id: JsonRpcId | undefined, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

function requireMcpAuth(req: NextRequest): string | null {
  const expected = process.env.MCP_API_KEY;
  if (!expected) return "MCP_API_KEY ist nicht konfiguriert";

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== expected) return "Nicht autorisiert";
  return null;
}

const MCP_TOOLS = [
  {
    name: "get_daily_briefing",
    description:
      "Tageslagebericht mit kritischen Meldungen, Compliance-Hinweisen und Handlungsempfehlungen (Deutsch).",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Anzahl der Tage (Standard: 1 = heute)", default: 1 },
        severity: {
          type: "string",
          description: "Nach Schweregrad filtern",
          enum: ["critical", "high", "medium", "low", "info"],
        },
        topic: { type: "string", description: "Nach Thema filtern (z. B. microsoft, linux, ics)" },
        limit: { type: "number", description: "Maximale Anzahl Meldungen (Standard: 20)", default: 20 },
      },
    },
  },
  {
    name: "search_alerts",
    description:
      "Suche in CyberLage nach Stichwort, CVE-ID, Produktname oder Hersteller. Liefert passende Meldungen mit Risikoscore und Compliance-Zuordnung.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: 'Suchbegriff (z. B. "Apache Tomcat", "CVE-2026-24423")' },
        days: { type: "number", description: "Suche in den letzten N Tagen (Standard: 30)", default: 30 },
        limit: { type: "number", description: "Maximale Treffer (Standard: 10)", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_compliance_status",
    description:
      "Compliance-Status für NIS2, DORA oder DSGVO. Liefert Meldungen mit Meldepflicht, Referenzen und Handlungsempfehlungen.",
    inputSchema: {
      type: "object",
      properties: {
        framework: { type: "string", description: "Regelwerk", enum: ["nis2", "dora", "gdpr"] },
        reportingOnly: { type: "boolean", description: "Nur meldepflichtige Meldungen zurückgeben", default: false },
        days: { type: "number", description: "Rückblick in Tagen (Standard: 7)", default: 7 },
        limit: { type: "number", description: "Maximale Treffer (Standard: 50)", default: 50 },
      },
      required: ["framework"],
    },
  },
  {
    name: "get_alert_detail",
    description:
      "Details zu einer Meldung per UUID oder CVE-ID (CVE-YYYY-NNNN) abrufen.",
    inputSchema: {
      type: "object",
      properties: {
        alertId: { type: "string", description: "Meldungs-UUID oder CVE-ID" },
      },
      required: ["alertId"],
    },
  },
  {
    name: "get_topic_summary",
    description:
      "Zusammenfassung der Meldungen für ein Thema (z. B. microsoft, linux, ics) der letzten N Tage.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Thema-ID",
          enum: TOPICS.map(t => t.id),
        },
        days: { type: "number", description: "Rückblick in Tagen (Standard: 7)", default: 7 },
      },
      required: ["topic"],
    },
  },
] as const;

async function getDailyBriefing(args: unknown) {
  const a = isRecord(args) ? args : {};
  const daysRaw = typeof a.days === "number" ? a.days : 1;
  const days = daysRaw <= 1 ? 0 : Math.min(365, Math.floor(daysRaw));
  const severity = typeof a.severity === "string" ? a.severity : undefined;
  const topic = typeof a.topic === "string" ? a.topic : undefined;
  const limit = typeof a.limit === "number" ? Math.min(50, Math.max(1, Math.floor(a.limit))) : 20;

  const range = resolveTimeRange({ days });
  const { alerts } = await queryAlerts({
    page: 1,
    pageSize: limit,
    from: range.start,
    to: range.end,
    severity: severity ? [severity] : undefined,
    topic: topic ? [topic] : undefined,
    sortBy: "score",
    sortDir: "DESC",
  });

  const mapped = alerts.map(a => {
    const topics = categorizeAlert({
      title: a.titleDe || a.title,
      affectedProducts: a.affectedProducts || [],
      affectedVendors: a.affectedVendors || [],
      alertType: a.alertType,
      sourceName: a.sourceName,
    });

    const reportingRequired =
      !!a.compliance?.nis2?.reportingRequired || !!a.compliance?.dora?.reportingRequired || !!a.compliance?.gdpr?.reportingRequired;

    return {
      id: a.id,
      title: a.titleDe || a.title,
      severity: a.severity,
      aiScore: a.aiScore,
      cvssScore: a.cvssScore ?? null,
      epssScore: a.epssScore ?? null,
      isActivelyExploited: !!a.isActivelyExploited,
      publishedAt: a.publishedAt,
      topics,
      compliance: {
        nis2: a.compliance?.nis2?.relevant ?? null,
        dora: a.compliance?.dora?.relevant ?? null,
        gdpr: a.compliance?.gdpr?.relevant ?? null,
        reportingRequired,
      },
      summaryDe: a.summaryDe ?? null,
    };
  });

  return {
    date: new Date().toISOString().slice(0, 10),
    period: days === 0 ? "Heute" : `Letzte ${days} Tage`,
    totalAlerts: mapped.length,
    criticalCount: mapped.filter(a => (a.severity || "").toString().toLowerCase() === "critical").length,
    alerts: mapped,
  };
}

async function searchAlertsTool(args: unknown) {
  const a = isRecord(args) ? args : {};
  const query = String(a.query || "").trim();
  if (!query) throw new Error("Suchbegriff fehlt");
  const limit = typeof a.limit === "number" ? Math.min(25, Math.max(1, Math.floor(a.limit))) : 10;

  const daysRaw = typeof a.days === "number" ? a.days : 30;
  const days = Math.min(365, Math.max(0, Math.floor(daysRaw)));
  const range = resolveTimeRange({ days: days === 1 ? 0 : days });

  // Für die Stichwortsuche bevorzugt AI Search.
  // Falls der Index ein Datumsfeld zum Filtern bietet, kann es hier aktiviert werden.
  const { results, total } = await searchAlerts(query, { top: limit, skip: 0 });

  return {
    query,
    timeRange: { start: range.start, end: range.end },
    total,
    results: results.map(r => ({
      id: r.id,
      title: r.titleDe || r.title,
      severity: r.severity,
      aiScore: r.aiScore ?? null,
      publishedAt: r.publishedAt ?? null,
      source: r.sourceName || r.sourceId || "UNBEKANNT",
      sourceUrl: r.sourceUrl || null,
    })),
  };
}

async function getComplianceStatus(args: unknown) {
  const a = isRecord(args) ? args : {};
  const frameworkRaw = String(a.framework || "").toLowerCase();
  if (!["nis2", "dora", "gdpr"].includes(frameworkRaw)) {
    throw new Error("Ungültiges Regelwerk");
  }
  const framework = frameworkRaw as Framework;

  const reportingOnly = !!a.reportingOnly;
  const daysRaw = typeof a.days === "number" ? a.days : 7;
  const days = daysRaw <= 1 ? 0 : Math.min(365, Math.floor(daysRaw));
  const limit = typeof a.limit === "number" ? Math.min(200, Math.max(1, Math.floor(a.limit))) : 50;
  const range = resolveTimeRange({ days });

  const { alerts, total } = await queryAlerts({
    page: 1,
    pageSize: limit,
    from: range.start,
    to: range.end,
    compliance: [framework],
    reportingOnly,
    sortBy: "score",
    sortDir: "DESC",
  });

  return {
    framework,
    timeRange: { start: range.start, end: range.end },
    total,
    alerts: alerts.map(a => ({
      id: a.id,
      title: a.titleDe || a.title,
      severity: a.severity,
      aiScore: a.aiScore ?? null,
      publishedAt: a.publishedAt,
      compliance: a.compliance?.[framework] ?? null,
    })),
  };
}

async function getAlertDetailTool(args: unknown) {
  const a = isRecord(args) ? args : {};
  const id = String(a.alertId || "").trim();
  if (!id) throw new Error("alertId fehlt");

  const cveMatch = id.match(/CVE-\\d{4}-\\d{4,7}/i);
  if (cveMatch) {
    const container = getAlertsContainer();
    const { resources } = await container.items
      .query({
        query: "SELECT TOP 10 * FROM c WHERE IS_DEFINED(c.cveIds) AND ARRAY_CONTAINS(c.cveIds, @cve) ORDER BY c.aiScore DESC",
        parameters: [{ name: "@cve", value: cveMatch[0].toUpperCase() }],
      })
      .fetchAll();
    return { cve: cveMatch[0].toUpperCase(), matches: resources };
  }

  const alert = await getAlertById(id);
  return alert || null;
}

async function getTopicSummary(args: unknown) {
  const a = isRecord(args) ? args : {};
  const topic = String(a.topic || "").trim().toLowerCase();
  if (!topic) throw new Error("Thema fehlt");

  const daysRaw = typeof a.days === "number" ? a.days : 7;
  const days = daysRaw <= 1 ? 0 : Math.min(365, Math.floor(daysRaw));
  const range = resolveTimeRange({ days });

  const { alerts } = await queryAlerts({
    page: 1,
    pageSize: 5000,
    from: range.start,
    to: range.end,
    sortBy: "score",
    sortDir: "DESC",
  });

  const matched = alerts.filter(a => {
    const topics = categorizeAlert({
      title: a.titleDe || a.title,
      affectedProducts: a.affectedProducts || [],
      affectedVendors: a.affectedVendors || [],
      alertType: a.alertType,
      sourceName: a.sourceName,
    });
    return topics.includes(topic);
  });

  return {
    topic,
    timeRange: { start: range.start, end: range.end },
    totalAlerts: matched.length,
    top: matched.slice(0, 20).map(a => ({
      id: a.id,
      title: a.titleDe || a.title,
      severity: a.severity,
      aiScore: a.aiScore ?? null,
      publishedAt: a.publishedAt,
    })),
  };
}

async function executeTool(name: string, args: unknown) {
  switch (name) {
    case "get_daily_briefing":
      return getDailyBriefing(args);
    case "search_alerts":
      return searchAlertsTool(args);
    case "get_compliance_status":
      return getComplianceStatus(args);
    case "get_alert_detail":
      return getAlertDetailTool(args);
    case "get_topic_summary":
      return getTopicSummary(args);
    default:
      throw new Error(`Unbekanntes Tool: ${name}`);
  }
}

export async function POST(req: NextRequest) {
  const authError = requireMcpAuth(req);
  if (authError) {
    return jsonRpcError(null, 401, authError);
  }

  let payload: JsonRpcRequest;
  try {
    payload = (await req.json()) as JsonRpcRequest;
  } catch {
    return jsonRpcError(null, -32700, "Ungültiges JSON");
  }

  const { id, method, params } = payload;

  try {
    if (method === "initialize") {
      return jsonRpcResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "cyberlage-mcp", version: "1.0.0" },
      });
    }

    if (method === "tools/list") {
      return jsonRpcResult(id, { tools: MCP_TOOLS });
    }

    if (method === "tools/call") {
      const paramsObj = isRecord(params) ? params : {};
      const toolName = typeof paramsObj.name === "string" ? paramsObj.name : null;
      const args = paramsObj.arguments;
      if (!toolName || typeof toolName !== "string") {
        return jsonRpcError(id, -32602, "Tool-Name fehlt");
      }
      const result = await executeTool(toolName, args);
      return jsonRpcResult(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    }

    return jsonRpcError(id, -32601, "Methode nicht gefunden");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonRpcError(id, -32000, message);
  }
}


