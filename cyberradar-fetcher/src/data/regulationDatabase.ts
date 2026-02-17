// © 2025 CyberLage
/**
 * Static Regulation Database
 * THE ONLY source of legal references in the system.
 * GPT-4o NEVER generates legal text — it produces trigger keywords,
 * and the rule engine matches those triggers against THIS database.
 */

import { RegulationEntry } from './types';

// ══════════════════════════════════════════════════════════
// NIS2 / BSIG 2.0
// ══════════════════════════════════════════════════════════

const NIS2_REGULATIONS: RegulationEntry[] = [
  {
    id: 'nis2-§28',
    framework: 'NIS2',
    reference: '§28 BSIG',
    titleDe: 'Essential entities',
    titleEn: 'Essential entities',
    summaryDe: 'Defines which entities qualify as "essential" under strictest NIS2 requirements.',
    summaryEn: 'Defines which entities qualify as "essential" under strictest NIS2 requirements.',
    triggers: ['entity_classification', 'sector_identification', 'critical_infrastructure'],
    applicableSectors: ['energy', 'transport', 'health', 'digital_infrastructure', 'water', 'space', 'public_admin'],
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Check if your organization qualifies as an essential entity under §28 BSIG',
      'Register with BSI per §33 BSIG within 3 months',
        ],
    actionItemsEn: [

      'Check if your organization qualifies as an essential entity under §28 BSIG',
      'Register with BSI per §33 BSIG within 3 months',
        ],
    relatedRegulations: ['nis2-§30', 'nis2-§32', 'nis2-§33'],
    sourceUrl: 'https://www.gesetze-im-internet.de/bsig_2024/',
  },
  {
    id: 'nis2-§29',
    framework: 'NIS2',
    reference: '§29 BSIG',
    titleDe: 'Important entities',
    titleEn: 'Important entities',
    summaryDe: 'Defines "important" entities with slightly less strict requirements than §28.',
    summaryEn: 'Defines "important" entities with slightly less strict requirements than §28.',
    triggers: ['entity_classification', 'sector_identification'],
    applicableSectors: ['postal', 'waste', 'chemicals', 'food', 'manufacturing', 'digital_services', 'research'],
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Check if your organization qualifies as an important entity under §29 BSIG',
      'Register with BSI per §33 BSIG within 3 months',
        ],
    actionItemsEn: [

      'Check if your organization qualifies as an important entity under §29 BSIG',
      'Register with BSI per §33 BSIG within 3 months',
        ],
    relatedRegulations: ['nis2-§30', 'nis2-§33'],
    sourceUrl: 'https://www.gesetze-im-internet.de/bsig_2024/',
  },
  {
    id: 'nis2-§30',
    framework: 'NIS2',
    reference: '§30 BSIG',
    titleDe: 'Risk management measures',
    titleEn: 'Risk management measures',
    summaryDe: 'Requires technical and organizational measures for risk management: vulnerability management, access controls, encryption, supply chain security.',
    summaryEn: 'Requires technical and organizational measures for risk management: vulnerability management, access controls, encryption, supply chain security.',
    triggers: [
      'vulnerability_management', 'risk_assessment', 'access_control',
      'encryption', 'supply_chain', 'patch_management', 'security_update',
      'configuration_management', 'critical_vulnerability', 'unpatched_system', 'cve',
    ],
    applicableSectors: 'all',
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Assess the vulnerability relevance for your systems',
      'Check if affected products are used in your infrastructure',
      'Update your risk analysis per §30(1) BSIG',
      'Implement available patches or mitigation measures',
      'Document actions for audit evidence',
        ],
    actionItemsEn: [

      'Assess the vulnerability relevance for your systems',
      'Check if affected products are used in your infrastructure',
      'Update your risk analysis per §30(1) BSIG',
      'Implement available patches or mitigation measures',
      'Document actions for audit evidence',
        ],
    relatedRegulations: ['nis2-§31', 'nis2-§32'],
    sourceUrl: 'https://www.gesetze-im-internet.de/bsig_2024/',
  },
  {
    id: 'nis2-§31',
    framework: 'NIS2',
    reference: '§31 BSIG',
    titleDe: 'Special management requirements',
    titleEn: 'Special management requirements',
    summaryDe: 'Management must approve risk measures, oversee implementation, and bears personal liability.',
    summaryEn: 'Management must approve risk measures, oversee implementation, and bears personal liability.',
    triggers: ['management_liability', 'board_responsibility', 'security_training'],
    applicableSectors: 'all',
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Inform management about the new threat situation',
      'Document management acknowledgement',
        ],
    actionItemsEn: [

      'Inform management about the new threat situation',
      'Document management acknowledgement',
        ],
    relatedRegulations: ['nis2-§30'],
    sourceUrl: 'https://www.gesetze-im-internet.de/bsig_2024/',
  },
  {
    id: 'nis2-§32',
    framework: 'NIS2',
    reference: '§32 BSIG',
    titleDe: 'Reporting obligations',
    titleEn: 'Reporting obligations',
    summaryDe: 'Significant security incidents must be reported to BSI: early warning 24h, full notification 72h, final report 1 month.',
    summaryEn: 'Significant security incidents must be reported to BSI: early warning 24h, full notification 72h, final report 1 month.',
    triggers: [
      'active_exploitation', 'data_breach', 'service_disruption',
      'ransomware_attack', 'significant_incident', 'operational_impact',
      'confirmed_compromise',
    ],
    applicableSectors: 'all',
    reportingRequired: true,
    reportingDeadline: {
      initialNotificationHours: 24,
      fullReportHours: 72,
      finalReportDays: 30,
      reportTo: 'BSI',
      reportToDe: 'BSI',
    },
    actionItemsDe: [

      'IMMEDIATELY: Check if your organization is affected by the active exploitation',
      'If YES: Early warning to BSI within 24 hours (§32(1)(1) BSIG)',
      'Within 72 hours: Full notification with severity and impact',
      'Within 1 month: Final report with root cause analysis',
      'Report via BSI portal: https://www.bsi.bund.de/meldestelle',
        ],
    actionItemsEn: [

      'IMMEDIATELY: Check if your organization is affected by the active exploitation',
      'If YES: Early warning to BSI within 24 hours (§32(1)(1) BSIG)',
      'Within 72 hours: Full notification with severity and impact',
      'Within 1 month: Final report with root cause analysis',
      'Report via BSI portal: https://www.bsi.bund.de/meldestelle',
        ],
    relatedRegulations: ['nis2-§30', 'dora-art17', 'gdpr-art33'],
    sourceUrl: 'https://www.gesetze-im-internet.de/bsig_2024/',
  },
  {
    id: 'nis2-§33',
    framework: 'NIS2',
    reference: '§33 BSIG',
    titleDe: 'Registration obligation',
    titleEn: 'Registration obligation',
    summaryDe: 'Essential and important entities must register with BSI within 3 months.',
    summaryEn: 'Essential and important entities must register with BSI within 3 months.',
    triggers: ['registration_deadline', 'entity_registration'],
    applicableSectors: 'all',
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Register with BSI within 3 months of entry into force',
        ],
    actionItemsEn: [

      'Register with BSI within 3 months of entry into force',
        ],
    relatedRegulations: ['nis2-§28', 'nis2-§29'],
    sourceUrl: 'https://www.gesetze-im-internet.de/bsig_2024/',
  },
];

// ══════════════════════════════════════════════════════════
// DORA (Digital Operational Resilience Act)
// ══════════════════════════════════════════════════════════

const DORA_REGULATIONS: RegulationEntry[] = [
  {
    id: 'dora-art5',
    framework: 'DORA',
    reference: 'Art. 5 DORA',
    titleDe: 'ICT risk management framework',
    titleEn: 'ICT risk management framework',
    summaryDe: 'Financial entities must establish a comprehensive ICT risk management framework.',
    summaryEn: 'Financial entities must establish a comprehensive ICT risk management framework.',
    triggers: ['risk_management', 'ict_infrastructure', 'vulnerability_management', 'financial_sector'],
    applicableSectors: ['finance', 'banking', 'insurance', 'investment'],
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Verify your ICT risk management measures meet DORA requirements',
      'Update your ICT risk analysis considering the new threat',
        ],
    actionItemsEn: [

      'Verify your ICT risk management measures meet DORA requirements',
      'Update your ICT risk analysis considering the new threat',
        ],
    relatedRegulations: ['nis2-§30'],
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R2554',
  },
  {
    id: 'dora-art17',
    framework: 'DORA',
    reference: 'Art. 17 DORA',
    titleDe: 'ICT-related incident reporting process',
    titleEn: 'ICT-related incident reporting process',
    summaryDe: 'Major ICT incidents to BaFin: initial 4h, intermediate 72h, final 1 month. SHORTEST deadline of all frameworks.',
    summaryEn: 'Major ICT incidents to BaFin: initial 4h, intermediate 72h, final 1 month. SHORTEST deadline of all frameworks.',
    triggers: [
      'active_exploitation', 'service_disruption', 'data_breach',
      'financial_system_impact', 'significant_incident', 'confirmed_compromise',
    ],
    applicableSectors: ['finance', 'banking', 'insurance', 'investment'],
    reportingRequired: true,
    reportingDeadline: {
      initialNotificationHours: 4,
      fullReportHours: 72,
      finalReportDays: 30,
      reportTo: 'BaFin',
      reportToDe: 'BaFin',
    },
    actionItemsDe: [

      'IMMEDIATELY: Check if your financial services systems are affected',
      'If YES: Initial report to BaFin within 4 hours (Art. 17(3) DORA)',
      'Within 72 hours: Intermediate report with detailed analysis',
      'Within 1 month: Final report with root cause analysis',
        ],
    actionItemsEn: [

      'IMMEDIATELY: Check if your financial services systems are affected',
      'If YES: Initial report to BaFin within 4 hours (Art. 17(3) DORA)',
      'Within 72 hours: Intermediate report with detailed analysis',
      'Within 1 month: Final report with root cause analysis',
        ],
    relatedRegulations: ['nis2-§32'],
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R2554',
  },
  {
    id: 'dora-art28',
    framework: 'DORA',
    reference: 'Art. 28 DORA',
    titleDe: 'ICT third-party risk management',
    titleEn: 'ICT third-party risk management',
    summaryDe: 'Financial entities must manage risks from ICT third-party service providers.',
    summaryEn: 'Financial entities must manage risks from ICT third-party service providers.',
    triggers: ['supply_chain', 'third_party', 'cloud_provider', 'saas_vulnerability', 'managed_service'],
    applicableSectors: ['finance', 'banking', 'insurance', 'investment'],
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Check if affected ICT providers are in your third-party register',
      'Assess the risk for your outsourced ICT services',
      'Notify your provider and request a statement',
        ],
    actionItemsEn: [

      'Check if affected ICT providers are in your third-party register',
      'Assess the risk for your outsourced ICT services',
      'Notify your provider and request a statement',
        ],
    relatedRegulations: ['dora-art5'],
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32022R2554',
  },
];

// ══════════════════════════════════════════════════════════
// GDPR
// ══════════════════════════════════════════════════════════

const GDPR_REGULATIONS: RegulationEntry[] = [
  {
    id: 'gdpr-art32',
    framework: 'GDPR',
    reference: 'Art. 32 GDPR',
    titleDe: 'Security of processing',
    titleEn: 'Security of processing',
    summaryDe: 'Controllers must implement appropriate technical and organizational measures.',
    summaryEn: 'Controllers must implement appropriate technical and organizational measures.',
    triggers: [
      'personal_data_processing', 'encryption_weakness', 'access_control_bypass',
      'authentication_bypass', 'pii_exposure',
    ],
    applicableSectors: 'all',
    reportingRequired: false,
    reportingDeadline: null,
    actionItemsDe: [

      'Check if personal data is endangered by the vulnerability',
      'Assess if your TOMs per Art. 32 GDPR are still adequate',
        ],
    actionItemsEn: [

      'Check if personal data is endangered by the vulnerability',
      'Assess if your TOMs per Art. 32 GDPR are still adequate',
        ],
    relatedRegulations: ['gdpr-art33'],
    sourceUrl: 'https://dsgvo-gesetz.de/art-32-dsgvo/',
  },
  {
    id: 'gdpr-art33',
    framework: 'GDPR',
    reference: 'Art. 33 GDPR',
    titleDe: 'Notification to supervisory authority',
    titleEn: 'Notification to supervisory authority',
    summaryDe: 'Personal data breach → notify supervisory authority within 72 hours.',
    summaryEn: 'Personal data breach → notify supervisory authority within 72 hours.',
    triggers: [
      'personal_data_breach', 'pii_exposure', 'data_exfiltration',
      'credential_theft', 'patient_data', 'customer_data_leak',
    ],
    applicableSectors: 'all',
    reportingRequired: true,
    reportingDeadline: {
      initialNotificationHours: 72,
      fullReportHours: 72,
      finalReportDays: null,
      reportTo: 'Data protection supervisory authority',
      reportToDe: 'Data protection supervisory authority',
    },
    actionItemsDe: [

      'CHECK: Was personal data compromised?',
      'If YES: Notify authority within 72 hours (Art. 33(1) GDPR)',
      'Document the breach, impact and measures taken',
      'Check notification obligation to affected persons (Art. 34 GDPR)',
        ],
    actionItemsEn: [

      'CHECK: Was personal data compromised?',
      'If YES: Notify authority within 72 hours (Art. 33(1) GDPR)',
      'Document the breach, impact and measures taken',
      'Check notification obligation to affected persons (Art. 34 GDPR)',
        ],
    relatedRegulations: ['gdpr-art32', 'gdpr-art34', 'nis2-§32'],
    sourceUrl: 'https://dsgvo-gesetz.de/art-33-dsgvo/',
  },
  {
    id: 'gdpr-art34',
    framework: 'GDPR',
    reference: 'Art. 34 GDPR',
    titleDe: 'Communication to the data subject',
    titleEn: 'Communication to the data subject',
    summaryDe: 'High-risk breach → notify affected persons without undue delay.',
    summaryEn: 'High-risk breach → notify affected persons without undue delay.',
    triggers: ['high_risk_data_breach', 'mass_pii_exposure', 'health_data_breach', 'financial_data_breach'],
    applicableSectors: 'all',
    reportingRequired: true,
    reportingDeadline: {
      initialNotificationHours: 0, // immediate
      fullReportHours: 0,
      finalReportDays: null,
      reportTo: 'Affected data subjects',
      reportToDe: 'Affected data subjects',
    },
    actionItemsDe: [

      'Notify affected persons without undue delay about the data breach',
      'Use clear language: nature of breach, likely consequences, measures taken',
      'Provide DPO contact details',
        ],
    actionItemsEn: [

      'Notify affected persons without undue delay about the data breach',
      'Use clear language: nature of breach, likely consequences, measures taken',
      'Provide DPO contact details',
        ],
    relatedRegulations: ['gdpr-art33'],
    sourceUrl: 'https://dsgvo-gesetz.de/art-34-dsgvo/',
  },
];

// ══════════════════════════════════════════════════════════
// COMBINED EXPORTS
// ══════════════════════════════════════════════════════════

export const ALL_REGULATIONS: RegulationEntry[] = [
  ...NIS2_REGULATIONS,
  ...DORA_REGULATIONS,
  ...GDPR_REGULATIONS,
];

export function getRegulationsByFramework(framework: string): RegulationEntry[] {
  return ALL_REGULATIONS.filter(r => r.framework === framework);
}

export function getRegulationById(id: string): RegulationEntry | undefined {
  return ALL_REGULATIONS.find(r => r.id === id);
}

export function getRegulationsByTrigger(trigger: string): RegulationEntry[] {
  return ALL_REGULATIONS.filter(r => r.triggers.includes(trigger));
}



