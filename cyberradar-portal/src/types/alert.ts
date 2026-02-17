// © 2025 CyberLage
// Typen für Meldungen
// Matches the CURRENT Cosmos DB schema used by the PoC (raw_alerts + enrichment fields)

export type AlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "unknown"
  // legacy / older values (still accepted)
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INFO"
  | "UNKNOWN";

export interface Alert {
  id: string;

  // Source metadata
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceCategory?: string;
  sourceTrustTier?: number;
  sourceLanguage?: string;

  // Core content
  title: string;
  titleDe?: string;
  description: string;
  summary?: string;
  summaryDe?: string;

  // Time fields (ISO strings)
  publishedAt: string;
  fetchedAt: string;
  updatedAt?: string;

  // Classification
  alertType: string;
  alertSubType?: string;
  severity: AlertSeverity | null;

  // CVE fields
  cveIds: string[];
  cvssScore: number | null;
  cvssVector: string | null;
  epssScore?: number | null;
  epssPercentile?: number | null;
  cvssCveId?: string | null;

  // AI enrichment
  aiScore: number | null;
  aiScoreReasoning?: string | null;
  scoreComponents?: {
    base: number;
    epss: number;
    threat: number;
    context: number;
  } | null;
  isProcessed: boolean;
  processingState?: string;
  enrichmentVersion?: number;

  // Compliance
  compliance?: {
    nis2?: ComplianceTag | null;
    dora?: ComplianceTag | null;
    gdpr?: ComplianceTag | null;
    iso27001?: unknown;
    aiAct?: unknown;
    sectors?: unknown;
  };

  // Threat indicators
  isActivelyExploited: boolean;
  isZeroDay: boolean;
  affectedVendors: string[];
  affectedProducts: string[];
  affectedVersions?: string[] | null;

  // Richer source detail (V3)
  csafDescription?: string | null;
  csafRecommendations?: string | null;
  articleText?: string | null;

  // Metadata
  contentHash: string;
  _ts?: number;

}

export interface ComplianceTag {
  relevant: "yes" | "no" | "conditional";
  confidence: "high" | "medium" | "low";
  references?: string[];
  reasoning: string;
  reportingRequired?: boolean;
  reportingDeadlineHours?: number;
  actionItemsDe?: string[];
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PortalStatsResponse {
  totalAlerts: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  activelyExploited: number;
  zeroDays: number;
  byTopic: Record<string, number>;
  bySource: { source: string; count: number }[];
  compliance: {
    nis2: { yes: number; conditional: number; reportingRequired: number };
    dora: { yes: number; conditional: number; reportingRequired: number };
    gdpr: { yes: number; conditional: number; reportingRequired: number };
  };
  urgentAlerts: Alert[];
  recentAlerts: Alert[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; id: string }[];
}

export type { AlertAction, AlertActionType, AlertStatus, AlertStatusValue, ComplianceMetrics } from "@/lib/audit";


