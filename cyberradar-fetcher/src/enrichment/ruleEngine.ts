// © 2025 CyberLage
/**
 * Rule Engine — Post-AI Validation
 * Sits BETWEEN GPT-4o output and Cosmos DB writes.
 * Catches AI hallucinations and enforces hard business rules.
 */

import { CyberRadarAlert } from '../types/schema';
import { AIAnalysisResult, RuleEngineOutput } from '../types/enrichment';
import { ComplianceMapping, ComplianceTag, RegulationEntry } from '../data/types';
import { ALL_REGULATIONS } from '../data/regulationDatabase';
import { ISO_CONTROLS } from '../data/iso27001Controls';
import { ALLOWED_TRIGGERS_SET } from '../data/triggerKeywords';

// ══════════════════════════════════════════════════════════
// PII and ICS keyword sets for rule-based detection
// ══════════════════════════════════════════════════════════

const PII_KEYWORDS = [
  'personal data', 'pii', 'personenbezogen', 'email address',
  'credentials', 'passwords', 'patient data', 'credit card', 'social security',
  'customer data', 'user data', 'account data',
];

const ICS_VENDORS = [
  'Siemens', 'Schneider Electric', 'Rockwell Automation',
  'Mitsubishi Electric', 'ABB', 'Honeywell', 'Hitachi Energy', 'Advantech',
];

const SUPPLY_CHAIN_KEYWORDS = [
  'supply chain', 'dependency', 'npm', 'pypi', 'maven',
  'package manager', 'lieferkette', 'third-party library', 'open source component',
];

// ══════════════════════════════════════════════════════════
// MAIN ENTRY
// ══════════════════════════════════════════════════════════

export function validateAndEnrich(
  alert: CyberRadarAlert,
  aiResult: AIAnalysisResult,
): RuleEngineOutput {
  const overrides: string[] = [];
  const warnings: string[] = [];
  const textLower = ((alert.title || '') + ' ' + (alert.description || '')).toLowerCase();

  // Work on a copy of triggers
  let triggers = [...aiResult.triggers];

  // ── Rule 1: CISA KEV = Always Actively Exploited ──
  if (alert.sourceId === 'cisa-kev' && !alert.isActivelyExploited) {
    // We flag it but don't modify the alert's isActivelyExploited here (that's read-only Phase 1 data)
    // Instead we ensure the trigger is present
    overrides.push('RULE_1: CISA KEV source — ensuring active_exploitation trigger');
  }
  if (alert.sourceId === 'cisa-kev' || alert.isActivelyExploited) {
    if (!triggers.includes('active_exploitation')) {
      triggers.push('active_exploitation');
      overrides.push('RULE_1: Added active_exploitation trigger for CISA KEV / actively exploited alert');
    }
  }

  // ── Rule 2: Active Exploitation → Mandatory Triggers ──
  if (alert.isActivelyExploited) {
    if (!triggers.includes('active_exploitation')) {
      triggers.push('active_exploitation');
      overrides.push('RULE_2: Added active_exploitation for actively exploited alert');
    }
    if (alert.cvssScore !== null && alert.cvssScore >= 9.0 && !triggers.includes('critical_vulnerability')) {
      triggers.push('critical_vulnerability');
      overrides.push('RULE_2: Added critical_vulnerability for CVSS >= 9.0 + actively exploited');
    }
  }

  // ── Rule 3: CVSS >= 7.0 → Vulnerability Management Triggers ──
  if (alert.cvssScore !== null && alert.cvssScore >= 7.0) {
    const mandatoryTriggers = ['vulnerability_management', 'patch_management', 'cve'];
    for (const t of mandatoryTriggers) {
      if (!triggers.includes(t)) {
        triggers.push(t);
      }
    }
    overrides.push('RULE_3: Added vuln management triggers for CVSS >= 7.0');
  }

  // ── Rule 4: aiScore Floor for Actively Exploited ──
  if (alert.isActivelyExploited && aiResult.aiScore < 70) {
    aiResult.aiScore = 70;
    aiResult.aiScoreReasoning += ' [Rule engine: Floor 70 for active exploitation]';
    overrides.push('RULE_4: Raised aiScore to 70 for active exploitation');
  }

  // ── Rule 5: aiScore Floor for CVSS >= 9.0 ──
  if (alert.cvssScore !== null && alert.cvssScore >= 9.0 && aiResult.aiScore < 80) {
    aiResult.aiScore = 80;
    aiResult.aiScoreReasoning += ' [Rule engine: Floor 80 for CVSS >= 9.0]';
    overrides.push('RULE_5: Raised aiScore to 80 for CVSS >= 9.0');
  }

  // ── Rule 6: PII Keywords → GDPR Triggers ──
  const hasPiiKeyword = PII_KEYWORDS.some(kw => textLower.includes(kw));
  if (hasPiiKeyword && !triggers.includes('pii_exposure')) {
    triggers.push('pii_exposure');
    overrides.push('RULE_6: Added pii_exposure from keyword detection');
  }

  // ── Rule 7: ICS/OT Vendor → Elevated Attention ──
  const allVendors = [
    ...(alert.affectedVendors || []),
    ...(aiResult.additionalVendors || []),
  ];
  const hasIcsVendor = ICS_VENDORS.some(v =>
    allVendors.some(av => av.toLowerCase().includes(v.toLowerCase()))
  );
  if (hasIcsVendor) {
    warnings.push('ICS/OT vendor detected — verify KRITIS relevance');
    if (!triggers.includes('critical_vulnerability') && alert.cvssScore !== null && alert.cvssScore >= 7.0) {
      triggers.push('critical_vulnerability');
      overrides.push('RULE_7: Added critical_vulnerability for ICS/OT vendor');
    }
  }

  // ── Rule 8: Supply Chain Keywords → Trigger ──
  const hasSupplyChainKeyword = SUPPLY_CHAIN_KEYWORDS.some(kw => textLower.includes(kw));
  if (hasSupplyChainKeyword && !triggers.includes('supply_chain')) {
    triggers.push('supply_chain');
    overrides.push('RULE_8: Added supply_chain from keyword detection');
  }

  // ── Rule 9: Strip Invalid Triggers ──
  const invalidTriggers = triggers.filter(t => !ALLOWED_TRIGGERS_SET.has(t));
  if (invalidTriggers.length > 0) {
    triggers = triggers.filter(t => ALLOWED_TRIGGERS_SET.has(t));
    overrides.push(`RULE_9: Removed invalid triggers: ${invalidTriggers.join(', ')}`);
  }

  // ── Rule 10: Info-Only Alerts Score Cap ──
  if (['guidance', 'enforcement', 'regulatory'].includes(aiResult.alertType)) {
    if (aiResult.aiScore > 60) {
      aiResult.aiScore = 60;
      aiResult.aiScoreReasoning += ' [Rule engine: Capped at 60 for non-threat alert]';
      overrides.push('RULE_10: Capped score at 60 for non-threat alert');
    }
  }

  // Deduplicate triggers
  triggers = [...new Set(triggers)];

  // Update aiResult with validated triggers
  aiResult.triggers = triggers;

  // ── Map triggers to compliance ──
  const compliance = mapToCompliance(triggers, alert);

  return {
    aiResult,
    compliance,
    overrides,
    warnings,
  };
}

// ══════════════════════════════════════════════════════════
// TRIGGER → COMPLIANCE MAPPING
// ══════════════════════════════════════════════════════════

function mapToCompliance(
  triggers: string[],
  alert: CyberRadarAlert
): ComplianceMapping {
  const result: ComplianceMapping = {
    nis2: null,
    dora: null,
    gdpr: null,
    iso27001: null,
    aiAct: null,
    sectors: null,
  };

  // ── NIS2 ──
  const nis2Entries = ALL_REGULATIONS.filter(r => r.framework === 'NIS2');
  const nis2Matches = nis2Entries.filter(r => r.triggers.some(t => triggers.includes(t)));

  if (nis2Matches.length > 0) {
    const hasReporting = nis2Matches.some(r => r.reportingRequired);
    const allRefs = [...new Set(nis2Matches.map(r => r.reference))];
    const allActions = [...new Set(nis2Matches.flatMap(r => r.actionItemsEn || r.actionItemsDe))];

    result.nis2 = {
      relevant: hasReporting ? 'yes' : 'conditional',
      confidence: alert.sourceTrustTier === 1 ? 'high' : 'medium',
      references: allRefs,
      reasoning: buildNIS2Reasoning(nis2Matches, alert),
      reportingRequired: hasReporting,
      reportingDeadlineHours: hasReporting ? 24 : null,
      actionItemsDe: allActions,
    };
  } else {
    result.nis2 = {
      relevant: 'no',
      confidence: 'high',
      references: [],
      reasoning: 'No NIS2-relevant triggers identified.',
      reportingRequired: false,
      reportingDeadlineHours: null,
      actionItemsDe: [],
    };
  }

  // ── DORA (always "conditional" — depends on org being financial sector) ──
  const doraEntries = ALL_REGULATIONS.filter(r => r.framework === 'DORA');
  const doraMatches = doraEntries.filter(r => r.triggers.some(t => triggers.includes(t)));

  if (doraMatches.length > 0) {
    const hasReporting = doraMatches.some(r => r.reportingRequired);
    result.dora = {
      relevant: 'conditional',
      confidence: 'medium',
      references: [...new Set(doraMatches.map(r => r.reference))],
      reasoning: `Relevant for financial-sector organizations: ${doraMatches.map(r => r.reference).join(', ')}. Applies only if your organization falls under DORA.`,
      reportingRequired: hasReporting,
      reportingDeadlineHours: hasReporting ? 4 : null, // DORA is 4h!
      actionItemsDe: [...new Set(doraMatches.flatMap(r => r.actionItemsEn || r.actionItemsDe))],
    };
  }

  // ── GDPR ──
  const gdprEntries = ALL_REGULATIONS.filter(r => r.framework === 'GDPR');
  const gdprMatches = gdprEntries.filter(r => r.triggers.some(t => triggers.includes(t)));

  if (gdprMatches.length > 0) {
    const hasArt33 = gdprMatches.some(r => r.id === 'gdpr-art33');
    result.gdpr = {
      relevant: hasArt33 ? 'conditional' : 'yes',
      confidence: hasArt33 ? 'medium' : 'high',
      references: [...new Set(gdprMatches.map(r => r.reference))],
      reasoning: buildGDPRReasoning(gdprMatches),
      reportingRequired: hasArt33,
      reportingDeadlineHours: hasArt33 ? 72 : null,
      actionItemsDe: [...new Set(gdprMatches.flatMap(r => r.actionItemsEn || r.actionItemsDe))],
    };
  }

  // ── ISO 27001 ──
  const isoMatches = Object.values(ISO_CONTROLS)
    .filter(ctrl => ctrl.triggers.some(t => triggers.includes(t)));

  if (isoMatches.length > 0) {
    result.iso27001 = {
      controls: isoMatches.map(c => c.control),
      reasoning: `Relevant controls: ${isoMatches.map(c => `${c.control} (${c.titleEn || c.titleDe})`).join(', ')}`,
    };
  }

  return result;
}

// ══════════════════════════════════════════════════════════
// REASONING BUILDERS
// ══════════════════════════════════════════════════════════

function buildNIS2Reasoning(matches: RegulationEntry[], alert: CyberRadarAlert): string {
  const parts: string[] = [];

  if (matches.some(m => m.id === 'nis2-§32')) {
    parts.push(
      alert.isActivelyExploited
        ? 'Active exploitation confirmed - check reporting obligation under Section 32 BSIG.'
        : 'Potential reporting obligation under Section 32 BSIG - verify whether a significant incident exists.'
    );
  }
  if (matches.some(m => m.id === 'nis2-§30')) {
    const cvssInfo = alert.cvssScore ? `CVSS ${alert.cvssScore}` : 'Vulnerability';
    parts.push(`Risk management under Section 30 BSIG: ${cvssInfo} requires assessment and mitigation.`);
  }
  if (matches.some(m => m.id === 'nis2-§31')) {
    parts.push('Inform management about the threat situation (Section 31 BSIG).');
  }

  return parts.join(' ') || 'NIS2 relevance based on identified triggers.';
}

function buildGDPRReasoning(matches: RegulationEntry[]): string {
  if (matches.some(m => m.id === 'gdpr-art33')) {
    return 'Possible personal-data breach. Check whether reporting is required under Art. 33 GDPR (72 hours).';
  }
  if (matches.some(m => m.id === 'gdpr-art32')) {
    return 'This vulnerability may impact processing security. Verify TOMs under Art. 32 GDPR.';
  }
  return 'GDPR relevance based on identified triggers.';
}



