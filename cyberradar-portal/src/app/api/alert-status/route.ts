// © 2025 CyberLage
// API: Alert-Status
import { NextRequest, NextResponse } from "next/server";
import { getAlertStatus, getAlertStatuses, type AlertStatus } from "@/lib/audit";

export const dynamic = "force-dynamic";

function emptyStatus(alertId: string): AlertStatus {
  return {
    id: alertId,
    alertId,
    tenantId: "default",
    status: "new",
    assignedTo: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedAt: null,
    priority: null,
    notes: null,
    ticketRef: null,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: "system",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = (searchParams.get("alertId") || "").trim();
    const alertIds = (searchParams.get("alertIds") || "").trim();

    if (alertId) {
      const status = await getAlertStatus(alertId);
      return NextResponse.json({ status: status || emptyStatus(alertId) });
    }

    if (alertIds) {
      const ids = alertIds
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 200);

      const map = await getAlertStatuses(ids);
      const obj: Record<string, AlertStatus> = {};
      for (const [id, status] of map.entries()) obj[id] = status;
      return NextResponse.json({ statuses: obj });
    }

    return NextResponse.json({ error: "alertId oder alertIds erforderlich" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Status-Abruf fehlgeschlagen:", message);
    return NextResponse.json({ error: "Status konnte nicht geladen werden" }, { status: 500 });
  }
}


