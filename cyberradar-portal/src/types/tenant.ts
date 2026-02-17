// © 2025 CyberLage
export type TenantSector =
  | "energy"
  | "transport"
  | "banking"
  | "health"
  | "water"
  | "digital_infrastructure"
  | "ict_management"
  | "space"
  | "postal"
  | "waste"
  | "chemicals"
  | "food"
  | "manufacturing"
  | "digital_providers"
  | "research"
  | "insurance"
  | "investment"
  | "crypto"
  | "pension"
  | "other";

export type Bundesland =
  | "bw"
  | "by"
  | "be"
  | "bb"
  | "hb"
  | "hh"
  | "he"
  | "mv"
  | "ni"
  | "nw"
  | "rp"
  | "sl"
  | "sn"
  | "st"
  | "sh"
  | "th"
  | "unknown";

export type Nis2Classification = "besonders_wichtig" | "wichtig" | null;

export interface TenantClassification {
  nis2: Nis2Classification;
  dora: boolean;
  dsgvo: boolean;
  dsgvoAuthority: string | null;
}

export interface TenantProfile {
  name: string;
  sector: TenantSector;
  employeeCount: number;
  annualRevenueEur: number;
  bundesland: Bundesland;
}

export type TenantConnectionMethod = "microsoft" | "manual-app" | "manual-products";
export type TenantConnectionStatus = "disconnected" | "pending" | "connected" | "error";

export interface TenantConnection {
  method: TenantConnectionMethod;
  status: TenantConnectionStatus;

  // Microsoft connection
  msTenantId?: string | null;
  consentGrantedAt?: string | null;

  // Manual app registration (stored encrypted)
  manualClientId?: string | null;
  manualClientSecretEnc?: string | null;

  // Manual product list (no external API)
  manualProductsEnabled?: boolean | null;

  lastError?: string | null;
}

export interface TenantSyncSummary {
  assetsImported: number;
  incidentsImported: number;
  matchesCreated: number;
  details?: {
    graph: {
      attempted: boolean;
      ok: boolean;
      incidentsFetched: number;
      error?: string | null;
    };
    defender: {
      attempted: boolean;
      ok: boolean;
      softwareFetched: number;
      machinesFetched: number;
      error?: string | null;
    };
    publicAlerts: {
      scanned: number;
      from: string;
      to: string;
    };
    matching: {
      matchesCreated: number;
    };
  } | null;
  warnings?: string[] | null;
}

export interface Tenant {
  id: string;
  createdAt: string;
  updatedAt: string;
  profile: TenantProfile;
  classification: TenantClassification;
  connection: TenantConnection;
  lastSyncAt?: string | null;
  lastSyncSummary?: TenantSyncSummary | null;
}

export type TenantAssetKind = "software" | "machine" | "manual_product";
export type TenantAssetSource = "defender" | "intune" | "manual";

export interface TenantAsset {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;

  kind: TenantAssetKind;
  source: TenantAssetSource;

  vendor?: string | null;
  name?: string | null;
  version?: string | null;
  cpe?: string | null;
  deviceCount?: number | null;

  machineId?: string | null;
  hostname?: string | null;
  osPlatform?: string | null;

  raw?: unknown;
}

export interface TenantIncident {
  id: string; // Cosmos ID (unique)
  tenantId: string;
  incidentId: string; // Original provider ID
  createdAt: string;
  updatedAt: string;

  title: string;
  severity: string;
  status: string;
  firstActivityAt?: string | null;
  lastActivityAt?: string | null;

  raw?: unknown;
}

export interface TenantIncidentCompliance {
  nis2: MeldepflichtTag | null;
  dora: MeldepflichtTag | null;
  dsgvo: MeldepflichtTag | null;
  reportingRequired: boolean;
  evidence?: string[];
  officialContext?: {
    consideredAlerts: number;
    matchedAlerts: number;
    strongestMatchScore: number;
    officialReportingSignals: number;
    byFramework: {
      nis2: number;
      dora: number;
      gdpr: number;
      reportingRequired: number;
    };
    topMatches: Array<{
      alertId: string;
      sourceName: string;
      sourceUrl: string;
      title: string;
      titleDe: string | null;
      publishedAt: string;
      relevanceScore: number;
      matchReasons: string[];
      cveOverlap: string[];
      frameworkSignal: {
        nis2: boolean;
        dora: boolean;
        gdpr: boolean;
        reportingRequired: boolean;
      };
    }>;
  };
}

export interface TenantIncidentWithCompliance extends TenantIncident {
  compliance: TenantIncidentCompliance;
  affectedAssetCount: number;
}

export type MatchType = "cpe" | "vendor_product" | "vendor_only";

export interface MatchedAssetRef {
  assetId: string;
  vendor: string | null;
  name: string | null;
  version: string | null;
  deviceCount: number | null;
  matchType: MatchType;
  confidence: number; // 0-1
}

export interface MeldepflichtTag {
  applicable: boolean;
  likely?: boolean;
  reason?: string;
  deadline?: string;
  authority?: string;
  articles?: string[];
}

export interface AlertMatch {
  id: string; // `${tenantId}:${alertId}`
  tenantId: string;
  alertId: string;
  createdAt: string;
  updatedAt: string;

  matchedAssets: MatchedAssetRef[];
  relevanceScore: number; // 0-100

  meldepflicht: {
    nis2: MeldepflichtTag | null;
    dora: MeldepflichtTag | null;
    dsgvo: MeldepflichtTag | null;
  };
}


