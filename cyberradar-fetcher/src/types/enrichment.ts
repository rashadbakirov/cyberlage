// © 2025 CyberLage
/**
 * AI Enrichment Pipeline Types
 */

export interface AIAnalysisResult {
  id: string;
  alertType: string;
  alertSubType: string | null;
  triggers: string[];
  aiScore: number;
  aiScoreReasoning: string;
  summary: string;
  additionalVendors: string[];
  additionalProducts: string[];
  piiAtRisk: boolean;
  icsOtRelevant: boolean;
  supplyChainRisk: boolean;
  /** Tokens used (populated after parsing response) */
  tokensUsed?: number;
}

export interface AIEnrichmentV2ComplianceTag {
  relevant: 'yes' | 'conditional' | 'no';
  confidence: 'high' | 'medium' | 'low';
  references: string[];
  reasoning: string;
  reportingRequired: boolean;
  reportingDeadlineHours: number | null;
  actionItemsDe: string[];
}

export interface AIEnrichmentV2Result {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  aiScore: number;
  aiScoreReasoning: string;
  summary: string;
  summaryDe: string;
  titleDe: string;
  compliance: {
    nis2: AIEnrichmentV2ComplianceTag | null;
    dora: AIEnrichmentV2ComplianceTag | null;
    gdpr: AIEnrichmentV2ComplianceTag | null;
  };
  /** Tokens used (populated after parsing response) */
  tokensUsed?: number;
}

export interface AIEnrichmentV3Result {
  summary: string;
  summaryDe: string;
  titleDe: string;
  compliance: {
    nis2: AIEnrichmentV2ComplianceTag | null;
    dora: AIEnrichmentV2ComplianceTag | null;
    gdpr: AIEnrichmentV2ComplianceTag | null;
  };
  /** Tokens used (populated after parsing response) */
  tokensUsed?: number;
}

export interface AICallMetrics {
  alertId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUSD: number;
  success: boolean;
  retryCount: number;
}

export interface RuleEngineOutput {
  aiResult: AIAnalysisResult;
  compliance: import('../data/types').ComplianceMapping;
  overrides: string[];
  warnings: string[];
}

export interface EnrichmentRunOptions {
  maxAlerts: number;
  alertId?: string;
  source: 'timer' | 'manual';
}

export interface EnrichmentRunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  totalSkipped: number;
  totalTokensUsed: number;
  estimatedCostUSD: number;
  durationMs: number;
  errors: { alertId: string; error: string }[];
}


