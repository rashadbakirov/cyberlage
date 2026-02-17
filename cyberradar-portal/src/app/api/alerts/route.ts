// © 2025 CyberLage
import { NextRequest, NextResponse } from "next/server";
import { queryAlerts } from "@/lib/cosmos";
import { resolveTimeRange } from "@/lib/timeRange";
import { categorizeAlert } from "@/lib/topics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(Math.max(1, Number.parseInt(searchParams.get("pageSize") || "25", 10)), 100);

    const severity = searchParams.get("severity") || undefined;
    const topic = searchParams.get("topic") || undefined;
    const source = searchParams.get("source") || undefined;
    const alertType = searchParams.get("type") || searchParams.get("alertType") || undefined;
    const compliance = searchParams.get("compliance") || undefined;
    const reportingOnly = (searchParams.get("reportingOnly") || "").toLowerCase() === "true";
    const exploitedOnly = (searchParams.get("exploitedOnly") || "").toLowerCase() === "true";

    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") || "score").toLowerCase();
    const sortDir = ((searchParams.get("sortDir") || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC") as "ASC" | "DESC";
    const daysParam = searchParams.get("days");
    const days = daysParam !== null && daysParam !== "" ? Number.parseInt(daysParam, 10) : 0;

    const range = resolveTimeRange({
      days: Number.isFinite(days) ? days : 0,
      startDate: searchParams.get("startDate") || searchParams.get("from"),
      endDate: searchParams.get("endDate") || searchParams.get("to"),
    });


    // Öffentlicher Lagebild-Modus.
    const { alerts, total } = await queryAlerts({
      page,
      pageSize,
      severity,
      topic,
      source,
      alertType,
      compliance,
      reportingOnly,
      exploitedOnly,
      search,
      sortBy,
      sortDir,
      from: range.start,
      to: range.end,
    });

    const alertSummaries = alerts.map(alert => {
      const topics = categorizeAlert({
        title: alert.titleDe || alert.title,
        affectedProducts: alert.affectedProducts || [],
        affectedVendors: alert.affectedVendors || [],
        alertType: alert.alertType,
        sourceName: alert.sourceName,
      });

      const reportingRequired =
        !!alert.compliance?.nis2?.reportingRequired ||
        !!alert.compliance?.dora?.reportingRequired ||
        !!alert.compliance?.gdpr?.reportingRequired;

      return {
        id: alert.id,
        title: alert.title,
        titleDe: alert.titleDe || null,
        summary: alert.summary || null,
        summaryDe: alert.summaryDe || null,
        severity: alert.severity,
        aiScore: alert.aiScore,
        cvssScore: alert.cvssScore ?? null,
        epssScore: alert.epssScore ?? null,
        epssPercentile: alert.epssPercentile ?? null,
        isActivelyExploited: !!alert.isActivelyExploited,
        isZeroDay: !!alert.isZeroDay,
        alertType: alert.alertType,
        sourceId: alert.sourceId,
        sourceName: alert.sourceName,
        sourceCategory: alert.sourceCategory || null,
        publishedAt: alert.publishedAt,
        fetchedAt: alert.fetchedAt,
        topics,
        compliance: {
          nis2Relevant: alert.compliance?.nis2?.relevant ?? null,
          doraRelevant: alert.compliance?.dora?.relevant ?? null,
          gdprRelevant: alert.compliance?.gdpr?.relevant ?? null,
          reportingRequired,
        },
        complianceTags: {
          nis2: alert.compliance?.nis2 ?? null,
          dora: alert.compliance?.dora ?? null,
          gdpr: alert.compliance?.gdpr ?? null,
        },
      };
    });

    return NextResponse.json({
      alerts: alertSummaries,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      timeRange: { start: range.start, end: range.end, days: range.days, labelDe: range.labelDe, labelEn: range.labelEn },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Alerts-API-Fehler:", message);
    return NextResponse.json({ error: "Alerts konnten nicht geladen werden" }, { status: 500 });
  }
}



