// © 2025 CyberLage
// API: alert actions
import { NextRequest, NextResponse } from "next/server";
import {
  getAlertActions,
  logAction,
  updateAlertStatus,
  type AlertActionType,
  type AlertStatus,
  type AlertStatusValue,
} from "@/lib/audit";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS: AlertActionType[] = [
  "acknowledged",
  "assessed",
  "assigned",
  "status_changed",
  "comment_added",
  "evidence_exported",
  "board_reported",
  "meldung_started",
  "ticket_created",
  "dismissed",
];

const ALLOWED_STATUSES: AlertStatusValue[] = ["new", "acknowledged", "in_progress", "resolved", "dismissed"];

type StatusUpdates = Partial<Omit<AlertStatus, "id" | "alertId" | "tenantId" | "lastUpdatedAt" | "lastUpdatedBy">>;

function isPriority(value: string): value is NonNullable<AlertStatus["priority"]> {
  return value === "critical" || value === "high" || value === "medium" || value === "low";
}

function getRequestMetadata(request: NextRequest): { ipAddress?: string; userAgent?: string } {
  const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-client-ip");
  const ipAddress = forwardedFor?.split(",")[0]?.trim();
  const userAgent = request.headers.get("user-agent") || undefined;
  return { ipAddress, userAgent };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      alertId?: string;
      action?: string;
      performedBy?: string;
      details?: Record<string, unknown>;
    };

    const alertId = (body.alertId || "").trim();
    const action = (body.action || "").trim();
    const performedBy = (body.performedBy || "").trim();
    const details = body.details || {};

    if (!alertId || !action || !performedBy) {
      return NextResponse.json(
        { error: "alertId, action, and performedBy are required" },
        { status: 400 }
      );
    }

    const metadata = getRequestMetadata(request);

    if (!ALLOWED_ACTIONS.includes(action as AlertActionType)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // 1) Immutable audit-log entry
    const record = await logAction({
      alertId,
      action: action as AlertActionType,
      performedBy,
      details,
      metadata,
    });

    // 2) Update mutable status based on action
    const now = new Date().toISOString();
    const statusUpdates: StatusUpdates = {};

    switch (action) {
      case "acknowledged": {
        statusUpdates.status = "acknowledged";
        statusUpdates.acknowledgedBy = performedBy;
        statusUpdates.acknowledgedAt = now;
        break;
      }
      case "assigned": {
        statusUpdates.status = "in_progress";
        const assignedToRaw = details["assignedTo"];
        statusUpdates.assignedTo =
          typeof assignedToRaw === "string" && assignedToRaw.trim() ? assignedToRaw.trim() : performedBy;
        break;
      }
      case "status_changed": {
        const candidateRaw = details["newStatus"];
        const candidate = typeof candidateRaw === "string" ? candidateRaw : "in_progress";
        const newStatus: AlertStatusValue = ALLOWED_STATUSES.includes(candidate as AlertStatusValue)
          ? (candidate as AlertStatusValue)
          : "in_progress";
        statusUpdates.status = newStatus;
        if (newStatus === "resolved") statusUpdates.resolvedAt = now;
        break;
      }
      case "dismissed": {
        statusUpdates.status = "dismissed";
        break;
      }
      case "comment_added": {
        const commentRaw = details["comment"];
        statusUpdates.notes = typeof commentRaw === "string" ? commentRaw : null;
        break;
      }
      case "ticket_created": {
        const ticketRefRaw = details["ticketRef"];
        statusUpdates.ticketRef = typeof ticketRefRaw === "string" ? ticketRefRaw : null;
        break;
      }
      case "assessed": {
        // Optional: allow manual priority in future
        const raw = details["priority"];
        if (typeof raw === "string") {
          const normalized = raw.toLowerCase();
          if (isPriority(normalized)) statusUpdates.priority = normalized;
        }
        break;
      }
      default: {
        // Other actions only append to audit log.
        break;
      }
    }

    if (Object.keys(statusUpdates).length > 0) {
      await updateAlertStatus({
        alertId,
        updates: statusUpdates,
        performedBy,
      });
    }

    return NextResponse.json({ success: true, action: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Alert action error:", message);
    return NextResponse.json({ error: "Action could not be recorded" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = (searchParams.get("alertId") || "").trim();

    if (!alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    const actions = await getAlertActions(alertId);
    return NextResponse.json({ actions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error fetching alert actions:", message);
    return NextResponse.json({ error: "Actions could not be loaded" }, { status: 500 });
  }
}



