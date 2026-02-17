// © 2025 CyberLage
// Audit-Logik

import { CosmosClient, type Container } from "@azure/cosmos";
import { randomUUID } from "crypto";

export type AlertActionType =
  | "acknowledged"
  | "assessed"
  | "assigned"
  | "status_changed"
  | "comment_added"
  | "evidence_exported"
  | "board_reported"
  | "meldung_started"
  | "ticket_created"
  | "dismissed";

export type AlertStatusValue = "new" | "acknowledged" | "in_progress" | "resolved" | "dismissed";

export interface AlertAction {
  id: string;
  alertId: string;
  tenantId: string;
  action: AlertActionType;
  performedBy: string;
  performedAt: string;
  details: Record<string, unknown>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface AlertStatus {
  id: string; // same as alertId
  alertId: string;
  tenantId: string;
  status: AlertStatusValue;
  assignedTo: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  priority: "critical" | "high" | "medium" | "low" | null;
  notes: string | null;
  ticketRef: string | null;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
}

export interface ComplianceMetrics {
  period: { from: string; to: string };
  totalAlerts: number;
  acknowledged: number;
  acknowledgedPercent: number;
  resolved: number;
  resolvedPercent: number;
  dismissed: number;
  avgResponseTimeHours: number | null;
  avgResolutionTimeHours: number | null;
  byStatus: Record<AlertStatusValue, number>;
  bySeverity: Record<string, { total: number; acknowledged: number; resolved: number }>;
  unresolved: { alertId: string; title: string; severity: string; daysOpen: number }[];
}

let cosmosClient: CosmosClient | null = null;
let actionsContainer: Container | null = null;
let statusContainer: Container | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  return value;
}

function getClient(): CosmosClient {
  if (!cosmosClient) {
    cosmosClient = new CosmosClient({
      endpoint: requireEnv("COSMOS_ENDPOINT"),
      key: requireEnv("COSMOS_KEY"),
    });
  }
  return cosmosClient;
}

function getDbName(): string {
  return process.env.COSMOS_DATABASE || "cyberradar";
}

function getActionsContainer(): Container {
  if (!actionsContainer) {
    actionsContainer = getClient().database(getDbName()).container("alert_actions");
  }
  return actionsContainer;
}

function getStatusContainer(): Container {
  if (!statusContainer) {
    statusContainer = getClient().database(getDbName()).container("alert_status");
  }
  return statusContainer;
}

export async function logAction(params: {
  alertId: string;
  action: AlertActionType;
  performedBy: string;
  details?: Record<string, unknown>;
  tenantId?: string;
  metadata?: { ipAddress?: string; userAgent?: string };
}): Promise<AlertAction> {
  const record: AlertAction = {
    id: randomUUID(),
    alertId: params.alertId,
    tenantId: params.tenantId || "default",
    action: params.action,
    performedBy: params.performedBy,
    performedAt: new Date().toISOString(),
    details: params.details || {},
    metadata: params.metadata,
  };

  const container = getActionsContainer();
  await container.items.create(record);
  return record;
}

export async function updateAlertStatus(params: {
  alertId: string;
  updates: Partial<Omit<AlertStatus, "id" | "alertId" | "tenantId" | "lastUpdatedAt" | "lastUpdatedBy">>;
  performedBy: string;
  tenantId?: string;
}): Promise<AlertStatus> {
  const container = getStatusContainer();
  const tenantId = params.tenantId || "default";

  let existing: AlertStatus | null = null;
  try {
    const { resource } = await container.item(params.alertId, params.alertId).read<AlertStatus>();
    existing = resource || null;
  } catch {
    existing = null;
  }

  const now = new Date().toISOString();

  const status: AlertStatus = {
    id: params.alertId,
    alertId: params.alertId,
    tenantId,
    status: params.updates.status || existing?.status || "new",
    assignedTo: params.updates.assignedTo ?? existing?.assignedTo ?? null,
    acknowledgedBy: params.updates.acknowledgedBy ?? existing?.acknowledgedBy ?? null,
    acknowledgedAt: params.updates.acknowledgedAt ?? existing?.acknowledgedAt ?? null,
    resolvedAt: params.updates.resolvedAt ?? existing?.resolvedAt ?? null,
    priority: params.updates.priority ?? existing?.priority ?? null,
    notes: params.updates.notes ?? existing?.notes ?? null,
    ticketRef: params.updates.ticketRef ?? existing?.ticketRef ?? null,
    lastUpdatedAt: now,
    lastUpdatedBy: params.performedBy,
  };

  await container.items.upsert(status);
  return status;
}

export async function getAlertStatus(alertId: string): Promise<AlertStatus | null> {
  const container = getStatusContainer();
  try {
    const { resource } = await container.item(alertId, alertId).read<AlertStatus>();
    return resource || null;
  } catch {
    return null;
  }
}

export async function getAlertActions(alertId: string): Promise<AlertAction[]> {
  const container = getActionsContainer();
  const query = {
    query: "SELECT * FROM c WHERE c.alertId = @alertId ORDER BY c.performedAt DESC",
    parameters: [{ name: "@alertId", value: alertId }],
  };

  const { resources } = await container.items.query<AlertAction>(query, { partitionKey: alertId }).fetchAll();
  return resources;
}

export async function getAlertStatuses(alertIds: string[]): Promise<Map<string, AlertStatus>> {
  const map = new Map<string, AlertStatus>();
  if (alertIds.length === 0) return map;

  const container = getStatusContainer();

  const ids = alertIds.slice(0, 200);
  const { resources } = await container.items
    .query<AlertStatus>({
      query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@ids, c.alertId)",
      parameters: [{ name: "@ids", value: ids }],
    })
    .fetchAll();

  for (const s of resources) map.set(s.alertId, s);
  return map;
}

export async function getComplianceMetrics(params: {
  from: string;
  to: string;
  alertIds: string[];
  alerts: Array<{ id: string; title: string; titleDe?: string | null; severity: string; publishedAt: string }>;
}): Promise<ComplianceMetrics> {
  const statuses = await getAlertStatuses(params.alertIds);
  const now = new Date();

  let acknowledged = 0;
  let resolved = 0;
  let dismissed = 0;

  const byStatus: Record<AlertStatusValue, number> = {
    new: 0,
    acknowledged: 0,
    in_progress: 0,
    resolved: 0,
    dismissed: 0,
  };

  const bySeverity: Record<string, { total: number; acknowledged: number; resolved: number }> = {};

  const responseTimesMs: number[] = [];
  const resolutionTimesMs: number[] = [];

  const unresolved: Array<{ alertId: string; title: string; severity: string; daysOpen: number }> = [];

  for (const a of params.alerts) {
    const status = statuses.get(a.id);
    const statusValue: AlertStatusValue = status?.status || "new";

    byStatus[statusValue] += 1;

    const sev = (a.severity || "info").toLowerCase();
    if (!bySeverity[sev]) bySeverity[sev] = { total: 0, acknowledged: 0, resolved: 0 };
    bySeverity[sev].total += 1;

    const publishedAt = new Date(a.publishedAt);
    const acknowledgedAt = status?.acknowledgedAt ? new Date(status.acknowledgedAt) : null;
    const resolvedAt = status?.resolvedAt ? new Date(status.resolvedAt) : null;

    if (acknowledgedAt && Number.isFinite(acknowledgedAt.getTime()) && Number.isFinite(publishedAt.getTime())) {
      acknowledged += 1;
      bySeverity[sev].acknowledged += 1;
      responseTimesMs.push(acknowledgedAt.getTime() - publishedAt.getTime());
    }

    if (statusValue === "resolved") {
      resolved += 1;
      bySeverity[sev].resolved += 1;
      if (resolvedAt && acknowledgedAt && Number.isFinite(resolvedAt.getTime()) && Number.isFinite(acknowledgedAt.getTime())) {
        resolutionTimesMs.push(resolvedAt.getTime() - acknowledgedAt.getTime());
      }
    }

    if (statusValue === "dismissed") dismissed += 1;

    const isUnresolved = statusValue !== "resolved" && statusValue !== "dismissed";
    if (isUnresolved && (sev === "critical" || sev === "high")) {
      const ageDays = Number.isFinite(publishedAt.getTime())
        ? Math.max(0, Math.round((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      unresolved.push({
        alertId: a.id,
        title: a.titleDe || a.title,
        severity: sev,
        daysOpen: ageDays,
      });
    }
  }

  const avgResponseTimeHours =
    responseTimesMs.length > 0
      ? Math.round((responseTimesMs.reduce((x, y) => x + y, 0) / responseTimesMs.length / (1000 * 60 * 60)) * 10) /
        10
      : null;

  const avgResolutionTimeHours =
    resolutionTimesMs.length > 0
      ? Math.round((resolutionTimesMs.reduce((x, y) => x + y, 0) / resolutionTimesMs.length / (1000 * 60 * 60)) * 10) /
        10
      : null;

  const totalAlerts = params.alerts.length;

  return {
    period: { from: params.from, to: params.to },
    totalAlerts,
    acknowledged,
    acknowledgedPercent: totalAlerts > 0 ? Math.round((acknowledged / totalAlerts) * 100) : 0,
    resolved,
    resolvedPercent: totalAlerts > 0 ? Math.round((resolved / totalAlerts) * 100) : 0,
    dismissed,
    avgResponseTimeHours,
    avgResolutionTimeHours,
    byStatus,
    bySeverity,
    unresolved: unresolved.sort((a, b) => b.daysOpen - a.daysOpen).slice(0, 20),
  };
}


