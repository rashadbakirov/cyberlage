// © 2025 CyberLage
/**
 * CyberLage deterministischer Risikoscore (V3)
 *
 * Erzeugt einen 0–100 Score anhand realer Threat-Intelligence-Signale.
 * Ziel: CVSS-Clusterung aufbrechen, indem EPSS, Exploit-Status,
 * Produktimpact und Quellenkontext gewichtet werden.
 *
 * Score-Aufbau:
 *   baseScore    (0-40)  -> aus CVSS-Schwere
 *   epssBonus    (0-25)  -> aus Ausnutzungswahrscheinlichkeit (Schlüsselsignal)
 *   threatBonus  (0-20)  -> aus Exploit/Zero-Day/KEV-Flags
 *   contextBonus (0-15)  -> aus Quellen-Tier, CVE-Anzahl, Produktkritikalität
 */

export interface ScoringInput {
  cvssScore: number | null;
  epssScore: number | null;        // 0.0 - 1.0
  epssPercentile: number | null;   // 0.0 - 1.0
  isActivelyExploited: boolean;
  isZeroDay: boolean;
  alertType: string;               // vulnerability, exploit, breach, malware, apt, etc.
  sourceName: string;
  sourceTrustTier: number;         // 1 = official/government, 2 = news/vendor
  cveCount: number;                // length of cveIds array
  affectedProducts: string[];
  severity: string | null;         // from AI or CVSS-based classification

  // M365-Mandanten-Signale (optional)
  m365IsMajorChange?: boolean;
  m365ActionRequiredBy?: string | null;
  m365Status?: string | null;      // e.g., serviceInterruption / serviceDegradation
}

export interface ScoringResult {
  aiScore: number;                 // 0-100
  aiScoreReasoning: string;        // human-readable explanation (German)
  scoreComponents: {
    base: number;
    epss: number;
    threat: number;
    context: number;
  };
}

// Kritische Produkte für den deutschen Enterprise-Markt
const CRITICAL_PRODUCTS_DE = [
  'microsoft', 'windows', 'exchange', 'azure', 'office', '365',
  'linux', 'kernel', 'ubuntu', 'red hat', 'rhel', 'suse', 'debian',
  'sap', 'siemens', 'sinec', 'simatic',
  'apache', 'tomcat', 'httpd', 'struts',
  'vmware', 'vcenter', 'esxi',
  'cisco', 'fortinet', 'fortigate', 'palo alto',
  'oracle', 'mysql', 'postgresql',
  'citrix', 'ivanti',
  'gitlab', 'jenkins', 'docker', 'kubernetes',
  'chrome', 'edge', 'firefox',
  'openssl', 'openssh',
  'wordpress', 'drupal',
  'qnap', 'synology',
  'zoom', 'teams',
];

export function calculateRiskScore(input: ScoringInput): ScoringResult {
  const reasons: string[] = [];

  // -- BASIS-SCORE (0-40) aus CVSS --
  let base = 0;

  // Sonderbehandlung für Microsoft-365-Mandanten-Feeds (ohne CVSS/EPSS).
  if (input.alertType === 'm365-update' || input.alertType === 'm365-roadmap') {
    const major = Boolean(input.m365IsMajorChange);
    const actionRequired = Boolean(input.m365ActionRequiredBy);
    if (major && actionRequired) {
      base = 25;
      reasons.push('Microsoft 365: Major Change mit Deadline');
    } else if (major) {
      base = 18;
      reasons.push('Microsoft 365: Major Change');
    } else {
      base = 8;
      reasons.push('Microsoft 365: Hinweis/Änderung');
    }
  } else if (input.alertType === 'm365-health') {
    const status = (input.m365Status || '').toLowerCase();
    if (status.includes('interruption') || status.includes('outage')) {
      base = 35;
      reasons.push('Microsoft 365: Serviceunterbrechung');
    } else if (status.includes('degradation') || status.includes('degraded')) {
      base = 25;
      reasons.push('Microsoft 365: Service-Degradierung');
    } else {
      base = 15;
      reasons.push('Microsoft 365: Service-Hinweis');
    }
  }

  if (input.cvssScore !== null && input.cvssScore !== undefined) {
    if (input.cvssScore >= 9.0) { base = 35; reasons.push(`CVSS ${input.cvssScore} (kritisch)`); }
    else if (input.cvssScore >= 8.0) { base = 30; reasons.push(`CVSS ${input.cvssScore} (hoch)`); }
    else if (input.cvssScore >= 7.0) { base = 25; reasons.push(`CVSS ${input.cvssScore} (hoch)`); }
    else if (input.cvssScore >= 5.0) { base = 18; reasons.push(`CVSS ${input.cvssScore} (mittel)`); }
    else if (input.cvssScore >= 3.0) { base = 10; reasons.push(`CVSS ${input.cvssScore} (niedrig)`); }
    else { base = 5; reasons.push(`CVSS ${input.cvssScore}`); }
  } else if (base === 0) {
    // Kein CVSS – alertType als Proxy nutzen
    const typeScores: Record<string, number> = {
      'exploit': 28, 'apt': 28, 'breach': 25, 'malware': 22,
      'vulnerability': 18, 'advisory': 12, 'guidance': 8, 'regulatory': 8, 'other': 10,
    };
    base = typeScores[input.alertType] || 15;
    reasons.push(`Kein CVSS, Typ: ${input.alertType}`);
  }

  // -- EPSS-BONUS (0-25) -- Schlüsseldifferenzierung --
  // Bricht die reine CVSS-Clusterung auf.
  // Beispiel: zwei Alerts mit CVSS 7.5 – EPSS 0.001 (niedrig) vs. 0.4 (hoch)
  let epss = 0;
  if (
    input.alertType !== 'm365-update' &&
    input.alertType !== 'm365-roadmap' &&
    input.alertType !== 'm365-health' &&
    input.epssScore !== null &&
    input.epssScore !== undefined &&
    input.epssScore > 0
  ) {
    if (input.epssScore >= 0.5) { epss = 25; reasons.push(`EPSS ${(input.epssScore * 100).toFixed(1)}% — sehr hohes Ausnutzungsrisiko`); }
    else if (input.epssScore >= 0.2) { epss = 20; reasons.push(`EPSS ${(input.epssScore * 100).toFixed(1)}% — hohes Ausnutzungsrisiko`); }
    else if (input.epssScore >= 0.1) { epss = 15; reasons.push(`EPSS ${(input.epssScore * 100).toFixed(1)}% — erhöhtes Ausnutzungsrisiko`); }
    else if (input.epssScore >= 0.05) { epss = 10; reasons.push(`EPSS ${(input.epssScore * 100).toFixed(1)}%`); }
    else if (input.epssScore >= 0.01) { epss = 5; reasons.push(`EPSS ${(input.epssScore * 100).toFixed(1)}%`); }
    else if (input.epssScore >= 0.001) { epss = 2; }
    // else: EPSS < 0.1% -> 0 bonus (very unlikely to be exploited)
  }

  // -- THREAT BONUS (0-20) from active signals --
  let threat = 0;
  if (input.alertType === 'm365-health') {
    // Tenant availability incidents should bubble up slightly but not be treated like exploited CVEs.
    threat += base >= 35 ? 10 : base >= 25 ? 5 : 0;
  }
  if (input.isActivelyExploited) {
    threat += 15;
    reasons.push('Aktiv ausgenutzt');
  }
  if (input.isZeroDay) {
    threat += 10;
    reasons.push('Zero-Day');
  }
  if (input.alertType === 'breach') {
    threat += 5;
    reasons.push('Bestätigter Vorfall');
  }
  if (input.alertType === 'apt') {
    threat += 5;
    reasons.push('APT-Kampagne');
  }
  // Cap threat at 20
  threat = Math.min(20, threat);

  // -- CONTEXT BONUS (0-15) --
  let context = 0;

  // Source trust tier
  if (input.sourceTrustTier === 1) { context += 3; } // BSI, CISA, MSRC, vendor CERT

  // Product criticality for German market
  const productsLower = (input.affectedProducts || []).map(p => p.toLowerCase()).join(' ');
  const isCriticalProduct = CRITICAL_PRODUCTS_DE.some(cp => productsLower.includes(cp));
  if (isCriticalProduct) {
    context += 5;
    reasons.push('Weit verbreitetes Produkt');
  }

  // Multi-CVE advisory (bigger patch burden)
  if (input.cveCount > 20) { context += 4; reasons.push(`${input.cveCount} CVEs`); }
  else if (input.cveCount > 5) { context += 2; }

  // CISA KEV source = highest urgency
  if (input.sourceName.includes('Known Exploited')) {
    context += 5;
    reasons.push('CISA KEV Katalog');
  }

  // Cap context at 15
  context = Math.min(15, context);

  // -- TOTAL --
  let total = base + epss + threat + context;

  // Floor enforcement for high-threat indicators
  if (input.isActivelyExploited) { total = Math.max(total, 85); }
  if (input.isZeroDay) { total = Math.max(total, 80); }

  // Info/guidance items capped
  if (['guidance', 'regulatory', 'other'].includes(input.alertType) && !input.isActivelyExploited) {
    total = Math.min(total, 45);
  }

  total = Math.min(100, Math.max(0, total));

  return {
    aiScore: Math.round(total),
    aiScoreReasoning: reasons.join('. ') + '.',
    scoreComponents: { base, epss, threat, context },
  };
}

/**
 * Deterministic severity from CVSS (backup/validation for AI severity).
 * Only overrides AI if there's a major mismatch.
 */
export function determineSeverityV3(alert: {
  severity?: string | null;
  cvssScore?: number | null;
  aiScore?: number | null;
  isActivelyExploited?: boolean;
}): string {
  const current = alert.severity?.toLowerCase();

  // If AI set a severity AND it's consistent with CVSS, keep it
  if (current && current !== 'null' && current !== 'unknown') {
    // Only override if there's a major mismatch
    if (alert.cvssScore !== null && alert.cvssScore !== undefined) {
      if (alert.cvssScore >= 9.0 && current === 'medium') {
        return 'critical'; // AI was wrong
      }
      if (alert.cvssScore < 4.0 && current === 'critical') {
        return 'low'; // AI was wrong
      }
    }
    return current; // Keep AI's assessment
  }

  // No severity - determine from CVSS
  if (alert.cvssScore !== null && alert.cvssScore !== undefined) {
    if (alert.cvssScore >= 9.0) return 'critical';
    if (alert.cvssScore >= 7.0) return 'high';
    if (alert.cvssScore >= 4.0) return 'medium';
    return 'low';
  }

  // No CVSS - determine from aiScore
  if (alert.aiScore !== null && alert.aiScore !== undefined) {
    if (alert.aiScore >= 85) return 'critical';
    if (alert.aiScore >= 60) return 'high';
    if (alert.aiScore >= 35) return 'medium';
    if (alert.aiScore >= 15) return 'low';
    return 'info';
  }

  return 'medium'; // fallback
}


