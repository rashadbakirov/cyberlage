// © 2025 CyberLage
import { NextRequest, NextResponse } from "next/server";
import { getPortalStats, queryAlerts } from "@/lib/cosmos";
import { resolveTimeRange, previousPeriod } from "@/lib/timeRange";
import type { PortalStatsResponse } from "@/types/alert";

export const dynamic = "force-dynamic";

function buildDailyCountsFromAlerts(
  alerts: Array<{ publishedAt?: string; fetchedAt?: string; severity?: string | null }>,
  now: Date
): Array<{ date: string; total: number; critical: number }> {
  const dailyCounts: Array<{ date: string; total: number; critical: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setUTCDate(dayStart.getUTCDate() - i);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const dayAlerts = alerts.filter(a => {
      const pub = new Date(a.publishedAt || a.fetchedAt || "");
      return pub >= dayStart && pub < dayEnd;
    });

    dailyCounts.push({
      date: dayStart.toISOString().slice(0, 10),
      total: dayAlerts.length,
      critical: dayAlerts.filter(a => String(a.severity || "").toLowerCase() === "critical").length,
    });
  }
  return dailyCounts;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam !== null && daysParam !== "" ? Number.parseInt(daysParam, 10) : 0;
    const range = resolveTimeRange({
      days: Number.isFinite(days) ? days : 0,
      startDate: searchParams.get("startDate") || searchParams.get("from"),
      endDate: searchParams.get("endDate") || searchParams.get("to"),
    });


    // Öffentlicher Lagebild-Modus.
    const stats = await getPortalStats({ from: range.start, to: range.end });
    const prev = previousPeriod(range);
    const prevStats = await getPortalStats({ from: prev.start, to: prev.end });
    const previousPeriodTotal = prevStats.totalAlerts;
    const changePercent =
      previousPeriodTotal > 0
        ? Math.round(((stats.totalAlerts - previousPeriodTotal) / previousPeriodTotal) * 1000) / 10
        : 0;

    const now = new Date();
    const trendStart = new Date(now);
    trendStart.setUTCDate(trendStart.getUTCDate() - 6);
    trendStart.setUTCHours(0, 0, 0, 0);
    const { alerts: trendAlerts } = await queryAlerts({
      page: 1,
      pageSize: 5000,
      from: trendStart.toISOString(),
      to: now.toISOString(),
      sortBy: "date",
      sortDir: "ASC",
    });
    const dailyCounts = buildDailyCountsFromAlerts(
      trendAlerts.map(a => ({
        publishedAt: a.publishedAt,
        fetchedAt: a.fetchedAt,
        severity: a.severity,
      })),
      now
    );

    return NextResponse.json({
      timeRange: { start: range.start, end: range.end, days: range.days, labelDe: range.labelDe, labelEn: range.labelEn },
      ...stats,
      dailyCounts,
      trend: {
        previousPeriodTotal,
        changePercent,
        previousPeriodBySeverity: prevStats.bySeverity,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Stats API] Fehler:", message);
    return NextResponse.json(
      {
        error: "Statistiken konnten nicht geladen werden",
        details: message,
      },
      { status: 500 }
    );
  }
}


