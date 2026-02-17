// © 2025 CyberLage
/**
 * CyberRadar Data Schema — TypeScript Types
 * Based on TASK_02_DATA_SCHEMA.md
 */

// ══════════════════════════════════════════════════════════
// SUPPORTING ENUMS & TYPES
// ══════════════════════════════════════════════════════════

export type SourceCategory = "government" | "vendor" | "news" | "research" | "community" | "tenant";

export type AlertType =
  | "vulnerability"
  | "exploit"
  | "malware"
  | "apt"
  | "breach"
  | "advisory"
  | "guidance"
  | "enforcement"
  | "regulatory"
  | "m365-update"
  | "m365-health"
  | "m365-roadmap"
  | "other";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ProcessingState = "raw" | "enriched" | "verified" | "published";

export interface IoC {
  type: "ip" | "domain" | "url" | "hash-md5" | "hash-sha1" | "hash-sha256" | "email" | "cve";
  value: string;
  context: string | null;  // Where in the text this was found
}

export interface ComplianceTag {
  relevant: "yes" | "conditional" | "no";
  confidence: "high" | "medium" | "low";
  references: string[];  // e.g., ["§30 BSIG", "§32 BSIG"]
  reasoning: string;      // WHY this tag was applied
  reportingRequired: boolean;
  reportingDeadlineHours: number | null;
  actionItemsDe: string[];
}

export interface ComplianceEvidenceItem {
  trigger: string;
  source: 'field' | 'keyword' | 'derived';
  detail: string;
}

export interface ComplianceEvidence {
  triggers: string[];
  evidence: ComplianceEvidenceItem[];
  mappedReferences: {
    nis2: string[];
    dora: string[];
    gdpr: string[];
  };
  overrides: string[];
  policyVersion: string;
}

// ══════════════════════════════════════════════════════════
// MAIN ALERT SCHEMA
// ══════════════════════════════════════════════════════════

export interface CyberRadarAlert {
  // Identity
  id: string;                    // UUID v4
  contentHash: string;           // SHA-256 for dedup

  // Source metadata
  sourceId: string;              // PARTITION KEY
  sourceName: string;
  sourceCategory: SourceCategory;
  sourceTrustTier: 1 | 2 | 3;
  sourceUrl: string;
  sourceLanguage: "en" | "de";

  // Timestamps
  publishedAt: string;           // ISO 8601
  fetchedAt: string;
  updatedAt: string;

  // Content
  title: string;
  titleDe: string | null;        // Phase 2
  description: string;
  descriptionDe: string | null;  // Phase 2
  summary: string | null;        // Phase 2
  summaryDe: string | null;      // Phase 2

  // Classification
  alertType: AlertType;
  alertSubType: string | null;

  // Severity
  severity: Severity | null;
  cvssScore: number | null;      // 0.0 - 10.0
  cvssVector: string | null;
  cvssCveId?: string | null;     // which CVE produced cvssScore (if applicable)
  epssScore?: number | null;     // 0.0 - 1.0 (FIRST.org)
  epssPercentile?: number | null;// 0.0 - 1.0 (FIRST.org)
  isActivelyExploited: boolean;
  isZeroDay: boolean;

  // AI-computed (Phase 2)
  aiScore: number | null;
  aiScoreReasoning: string | null;
  scoreComponents?: {
    base: number;
    epss: number;
    threat: number;
    context: number;
  } | null;

  // Technical indicators
  cveIds: string[];
  affectedVendors: string[];
  affectedProducts: string[];
  affectedVersions: string[] | null;
  mitreTactics: string[];
  iocs: IoC[];

  // Rich source detail (Phase 3 / V3)
  csafDescription?: string | null;
  csafRecommendations?: string | null;
  articleText?: string | null;

  // Compliance mapping (Phase 2)
  compliance: {
    nis2: ComplianceTag | null;
    dora: ComplianceTag | null;
    gdpr: ComplianceTag | null;
    iso27001: string[] | null;
    aiAct: ComplianceTag | null;
    sectors: string[] | null;
  };
  compliancePolicyVersion?: string | null;
  complianceAiRaw?: {
    nis2: ComplianceTag | null;
    dora: ComplianceTag | null;
    gdpr: ComplianceTag | null;
    iso27001: string[] | null;
    aiAct: ComplianceTag | null;
    sectors: string[] | null;
  } | null;
  complianceEvidence?: ComplianceEvidence | null;

  // Processing state
  isProcessed: boolean;
  processingState: ProcessingState;
  enrichmentVersion?: number;

  // Raw source reference
  rawBlobPath: string | null;
  rawContentType: string;        // "rss-xml" | "html" | "json" | "api-response"

  // Cosmos DB metadata
  _ts?: number;
  _etag?: string;
}

// ══════════════════════════════════════════════════════════
// SOURCE REGISTRY SCHEMA
// ══════════════════════════════════════════════════════════

export interface SourceRegistryEntry {
  id: string;
  sourceId: string;
  category: SourceCategory;      // PARTITION KEY

  name: string;
  nameDE: string;
  trustTier: 1 | 2 | 3;

  fetchConfig: {
    type: "rss" | "api" | "web-scrape" | "json-feed";
    url: string;
    backupUrl: string | null;
    rateLimit: number;           // Min seconds between requests
    timeout: number;             // Max seconds per request
    headers: Record<string, string>;
    parser: string;              // Parser function name
  };

  lastFetchAt: string | null;
  lastFetchStatus: "success" | "partial" | "error" | null;
  lastFetchItemCount: number;
  lastFetchError: string | null;
  consecutiveErrors: number;

  isEnabled: boolean;
  fetchIntervalOverride: number | null;
}

// ══════════════════════════════════════════════════════════
// FETCH LOG SCHEMA
// ══════════════════════════════════════════════════════════

export interface FetchLog {
  id: string;
  runId: string;                 // PARTITION KEY

  sourceId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;

  status: "success" | "partial" | "error";
  itemsFetched: number;
  itemsNew: number;
  itemsDuplicate: number;
  itemsError: number;

  error: string | null;
  errorStack: string | null;

  rawBlobPath: string | null;
}

// ══════════════════════════════════════════════════════════
// PARTIAL ALERT TYPE (for building alerts before storage)
// ══════════════════════════════════════════════════════════

export type PartialAlert = Omit<CyberRadarAlert, 'id' | 'contentHash' | 'fetchedAt' | 'updatedAt'>;


