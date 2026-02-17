// © 2025 CyberLage
/**
 * Regulation Database Type Definitions
 * Used by the rule engine and compliance mapper.
 */

export type Framework = 'NIS2' | 'DORA' | 'GDPR' | 'ISO27001';

export interface ReportingDeadline {
  initialNotificationHours: number;
  fullReportHours: number;
  finalReportDays: number | null;
  reportTo: string;
  reportToDe: string;
}

export interface RegulationEntry {
  id: string;
  framework: Framework;
  reference: string;
  titleDe: string;
  titleEn: string;
  summaryDe: string;
  summaryEn: string;
  triggers: string[];
  applicableSectors: string[] | 'all';
  reportingRequired: boolean;
  reportingDeadline: ReportingDeadline | null;
  actionItemsDe: string[];
  actionItemsEn: string[];
  relatedRegulations: string[];
  sourceUrl: string;
}

export interface ComplianceTag {
  relevant: 'yes' | 'no' | 'conditional';
  confidence: 'high' | 'medium' | 'low';
  references: string[];
  reasoning: string;
  reportingRequired: boolean;
  reportingDeadlineHours: number | null;
  actionItemsDe: string[];
}

export interface ComplianceMapping {
  nis2: ComplianceTag | null;
  dora: ComplianceTag | null;
  gdpr: ComplianceTag | null;
  iso27001: { controls: string[]; reasoning: string } | null;
  aiAct: null;
  sectors: string[] | null;
}


