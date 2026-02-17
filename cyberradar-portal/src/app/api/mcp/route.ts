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
  if (!expected) return "MCP_API_KEY is not configured";

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== expected) return "Unauthorized";
  return null;
}

const MCP_TOOLS = [
  {
    name: "get_daily_briefing",
    description:
      "Daily situational briefing with critical alerts, compliance context, and recommended actions.",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Number of days to include (default: 1 = today)", default: 1 },
        severity: {
          type: "string",
          description: "Filter by severity",
          enum: ["critical", "high", "medium", "low", "info"],
        },
        topic: { type: "string", description: "Filter by topic (for example: microsoft, linux, ics)" },
        limit: { type: "number", description: "Maximum number of alerts (default: 20)", default: 20 },
      },
    },
  },
  {
    name: "search_alerts",
    description:
      "Search CyberLage by keyword, CVE ID, product name, or vendor. Returns matching alerts with risk score and compliance mapping.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: 'Search term (for example: "Apache Tomcat", "CVE-2026-24423")' },
        days: { type: "number", description: "Look back over the last N days (default: 30)", default: 30 },
        limit: { type: "number", description: "Maximum results (default: 10)", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_compliance_status",
    description:
      "Compliance status for NIS2, DORA, or GDPR. Returns alerts with reporting relevance, references, and recommended actions.",
    inputSchema: {
      type: "object",
      properties: {
        framework: { type: "string", description: "Framework", enum: ["nis2", "dora", "gdpr"] },
        reportingOnly: { type: "boolean", description: "Return only reportable alerts", default: false },
        days: { type: "number", description: "Look-back window in days (default: 7)", default: 7 },
        limit: { type: "number", description: "Maximum results (default: 50)", default: 50 },
      },
      required: ["framework"],
    },
  },
  {
    name: "get_alert_detail",
    description:
      "Fetch alert details by UUID or CVE ID (CVE-YYYY-NNNN).",
    inputSchema: {
      type: "object",
      properties: {
        alertId: { type: "string", description: "Alert UUID or CVE ID" },
      },
      required: ["alertId"],
    },
  },
  {
    name: "get_topic_summary",
    description:
      "Topic summary for alerts over the last N days (for example: microsoft, linux, ics).",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Topic ID",
          enum: TOPICS.map(t => t.id),
        },
        days: { type: "number", description: "Look-back window in days (default: 7)", default: 7 },
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
      summary: a.summary || a.summaryDe || null,
    };
  });

  return {
    date: new Date().toISOString().slice(0, 10),
    period: days === 0 ? "Today" : `Last ${days} days`,
    totalAlerts: mapped.length,
    criticalCount: mapped.filter(a => (a.severity || "").toString().toLowerCase() === "critical").length,
    alerts: mapped,
  };
}

async function searchAlertsTool(args: unknown) {
  const a = isRecord(args) ? args : {};
  const query = String(a.query || "").trim();
  if (!query) throw new Error("Missing query");
  const limit = typeof a.limit === "number" ? Math.min(25, Math.max(1, Math.floor(a.limit))) : 10;

  const daysRaw = typeof a.days === "number" ? a.days : 30;
  const days = Math.min(365, Math.max(0, Math.floor(daysRaw)));
  const range = resolveTimeRange({ days: days === 1 ? 0 : days });

  // Prefer AI Search for keyword search.
  // If the index exposes a date field for filtering, it can be enabled here.
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
      source: r.sourceName || r.sourceId || "UNKNOWN",
      sourceUrl: r.sourceUrl || null,
    })),
  };
}

async function getComplianceStatus(args: unknown) {
  const a = isRecord(args) ? args : {};
  const frameworkRaw = String(a.framework || "").toLowerCase();
  if (!["nis2", "dora", "gdpr"].includes(frameworkRaw)) {
    throw new Error("Invalid framework");
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
  if (!id) throw new Error("Missing alertId");

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
  if (!topic) throw new Error("Missing topic");

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
      throw new Error(`Unknown tool: ${name}`);
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
    return jsonRpcError(null, -32700, "Invalid JSON");
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
        return jsonRpcError(id, -32602, "Missing tool name");
      }
      const result = await executeTool(toolName, args);
      return jsonRpcResult(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    }

    return jsonRpcError(id, -32601, "Method not found");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonRpcError(id, -32000, message);
  }
}



