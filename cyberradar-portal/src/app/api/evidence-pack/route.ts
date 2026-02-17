// © 2025 CyberLage
// API: Nachweispaket
import { NextRequest, NextResponse } from "next/server";
import { queryAlerts } from "@/lib/cosmos";
import { getComplianceMetrics } from "@/lib/audit";
import { resolveTimeRange } from "@/lib/timeRange";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Number.parseInt(searchParams.get("days") || "30", 10);

    const range = resolveTimeRange({
      days: Number.isFinite(days) ? days : 30,
      startDate: searchParams.get("startDate") || searchParams.get("from"),
      endDate: searchParams.get("endDate") || searchParams.get("to"),
    });

    const { alerts } = await queryAlerts({
      page: 1,
      pageSize: 5000,
      from: range.start,
      to: range.end,
      sortBy: "score",
      sortDir: "DESC",
    });

    const alertIds = alerts.map(a => a.id);
    const alertSummaries = alerts.map(a => ({
      id: a.id,
      title: a.title,
      titleDe: a.titleDe,
      severity: (a.severity || "info").toString().toLowerCase(),
      publishedAt: a.publishedAt || a.fetchedAt,
    }));

    const metrics = await getComplianceMetrics({
      from: range.start,
      to: range.end,
      alertIds,
      alerts: alertSummaries,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Nachweispaket-Fehler:", message);
    return NextResponse.json({ error: "Nachweispaket konnte nicht erstellt werden" }, { status: 500 });
  }
}


