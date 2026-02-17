// © 2025 CyberLage
/**
 * Public compliance validator (no-op for public release).
 * Keeps existing AI compliance tags but provides a consistent evidence object.
 */

import type { ComplianceEvidence, CyberRadarAlert } from '../types/schema';

export interface ComplianceValidationResult {
  complianceFinal: CyberRadarAlert['compliance'];
  complianceEvidence: ComplianceEvidence;
}

function defaultCompliance(): CyberRadarAlert['compliance'] {
  return {
    nis2: null,
    dora: null,
    gdpr: null,
    iso27001: null,
    aiAct: null,
    sectors: null,
  };
}

export function validatePublicComplianceForAlert(
  alert: CyberRadarAlert
): ComplianceValidationResult {
  return {
    complianceFinal: alert.compliance ?? defaultCompliance(),
    complianceEvidence: {
      triggers: [],
      evidence: [],
      mappedReferences: { nis2: [], dora: [], gdpr: [] },
      overrides: [],
      policyVersion: 'public-v1',
    },
  };
}
