// © 2025 CyberLage
import { IoC } from '../types/schema';

// ══════════════════════════════════════════════════════════
// CVE EXTRACTION
// ══════════════════════════════════════════════════════════

const CVE_REGEX = /CVE-\d{4}-\d{4,7}/gi;

export function extractCVEs(text: string): string[] {
  const matches = text.match(CVE_REGEX) || [];
  return [...new Set(matches.map(m => m.toUpperCase()))]; // Dedup + uppercase
}

// ══════════════════════════════════════════════════════════
// VENDOR NORMALIZATION
// ══════════════════════════════════════════════════════════

const VENDOR_ALIASES: Record<string, string> = {
  "fortinet": "Fortinet",
  "fortigate": "Fortinet",
  "fortios": "Fortinet",
  "microsoft": "Microsoft",
  "msrc": "Microsoft",
  "ivanti": "Ivanti",
  "cisco": "Cisco",
  "siemens": "Siemens",
  "schneider electric": "Schneider Electric",
  "schneider": "Schneider Electric",
  "rockwell": "Rockwell Automation",
  "rockwell automation": "Rockwell Automation",
  "palo alto": "Palo Alto Networks",
  "paloalto": "Palo Alto Networks",
  "google": "Google",
  "looker": "Google",
  "sap": "SAP",
  "vmware": "VMware",
  "broadcom": "Broadcom",
  "adobe": "Adobe",
  "apple": "Apple",
  "linux": "Linux",
  "gitlab": "GitLab",
  "atlassian": "Atlassian",
  "juniper": "Juniper Networks",
  "sophos": "Sophos",
  "f5": "F5 Networks",
  "checkpoint": "Check Point",
  "check point": "Check Point",
  "mitsubishi": "Mitsubishi Electric",
  "mitsubishi electric": "Mitsubishi Electric",
  "abb": "ABB",
  "advantech": "Advantech",
  "axis": "Axis Communications",
  "n8n": "n8n",
  "notepad++": "Notepad++",
};

export function normalizeVendor(vendorName: string): string {
  const lower = vendorName.toLowerCase().trim();
  return VENDOR_ALIASES[lower] || vendorName.trim();
}

/**
 * Extract vendor names from text using vendor list
 */
export function extractVendors(text: string): string[] {
  const textLower = text.toLowerCase();
  const found = new Set<string>();

  for (const [alias, normalized] of Object.entries(VENDOR_ALIASES)) {
    if (textLower.includes(alias)) {
      found.add(normalized);
    }
  }

  return Array.from(found);
}

// ══════════════════════════════════════════════════════════
// IOC EXTRACTION
// ══════════════════════════════════════════════════════════

const IOC_PATTERNS = {
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|de|ru|cn|xyz|top|info)\b/gi,
  md5: /\b[a-fA-F0-9]{32}\b/g,
  sha1: /\b[a-fA-F0-9]{40}\b/g,
  sha256: /\b[a-fA-F0-9]{64}\b/g,
  url: /https?:\/\/[^\s<>"']+/gi,
};

// Domains to exclude (known safe)
const SAFE_DOMAINS = new Set([
  'microsoft.com', 'github.com', 'cisa.gov', 'nvd.nist.gov',
  'fortinet.com', 'cisco.com', 'bsi.bund.de', 'cert-bund.de'
]);

export function extractIoCs(text: string): IoC[] {
  const iocs: IoC[] = [];

  // Extract IPs (but filter out version numbers like 7.4.5)
  const ipMatches = text.match(IOC_PATTERNS.ipv4) || [];
  for (const ip of ipMatches) {
    // Skip if it looks like a version number (e.g., starts with single digit)
    if (!/^\d\./.test(ip)) {
      iocs.push({
        type: 'ip',
        value: ip,
        context: extractContext(text, ip)
      });
    }
  }

  // Extract domains (filter out safe domains)
  const domainMatches = text.match(IOC_PATTERNS.domain) || [];
  for (const domain of domainMatches) {
    const domainLower = domain.toLowerCase();
    if (!SAFE_DOMAINS.has(domainLower)) {
      iocs.push({
        type: 'domain',
        value: domainLower,
        context: extractContext(text, domain)
      });
    }
  }

  // Extract hashes
  const md5Matches = text.match(IOC_PATTERNS.md5) || [];
  for (const hash of md5Matches) {
    iocs.push({ type: 'hash-md5', value: hash.toLowerCase(), context: extractContext(text, hash) });
  }

  const sha1Matches = text.match(IOC_PATTERNS.sha1) || [];
  for (const hash of sha1Matches) {
    iocs.push({ type: 'hash-sha1', value: hash.toLowerCase(), context: extractContext(text, hash) });
  }

  const sha256Matches = text.match(IOC_PATTERNS.sha256) || [];
  for (const hash of sha256Matches) {
    iocs.push({ type: 'hash-sha256', value: hash.toLowerCase(), context: extractContext(text, hash) });
  }

  // Dedup IoCs
  return deduplicateIoCs(iocs);
}

function extractContext(text: string, match: string, contextLength: number = 50): string | null {
  const index = text.indexOf(match);
  if (index === -1) return null;

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + match.length + contextLength);
  return text.substring(start, end).trim();
}

function deduplicateIoCs(iocs: IoC[]): IoC[] {
  const seen = new Set<string>();
  const result: IoC[] = [];

  for (const ioc of iocs) {
    const key = `${ioc.type}:${ioc.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(ioc);
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════
// SEVERITY MAPPING FROM CVSS
// ══════════════════════════════════════════════════════════

export function cvssToSeverity(cvssScore: number | null): "critical" | "high" | "medium" | "low" | null {
  if (cvssScore === null) return null;
  if (cvssScore >= 9.0) return "critical";
  if (cvssScore >= 7.0) return "high";
  if (cvssScore >= 4.0) return "medium";
  if (cvssScore >= 0.1) return "low";
  return null;
}

/**
 * Extract severity from source text as a fallback when CVSS is not available.
 * Looks for explicit severity labels commonly used by Fortinet PSIRT, CISA, BSI, etc.
 * Returns the highest severity found in the text.
 */
export function extractSeverityFromText(text: string): "critical" | "high" | "medium" | "low" | null {
  const lower = text.toLowerCase();

  // Check in priority order: highest severity first
  if (/\bcritical\b/.test(lower) && /\b(severity|risk|rated|priority|cvss)\b/.test(lower)) return 'critical';
  if (/\b(kritisch)\b/.test(lower)) return 'critical';

  if (/\bhigh\b/.test(lower) && /\b(severity|risk|rated|priority|cvss)\b/.test(lower)) return 'high';
  if (/\b(hoch)\b/.test(lower) && /\b(risiko|schwere|priorität)\b/.test(lower)) return 'high';

  if (/\bmedium\b/.test(lower) && /\b(severity|risk|rated|priority|cvss)\b/.test(lower)) return 'medium';
  if (/\b(mittel)\b/.test(lower) && /\b(risiko|schwere|priorität)\b/.test(lower)) return 'medium';

  if (/\blow\b/.test(lower) && /\b(severity|risk|rated|priority|cvss)\b/.test(lower)) return 'low';
  if (/\b(niedrig|gering)\b/.test(lower) && /\b(risiko|schwere|priorität)\b/.test(lower)) return 'low';

  // Simpler patterns for vendor sources that use "Critical" / "High" directly in titles
  // e.g. "FG-IR-24-001 - Critical" or "Severity: High"
  if (/severity[:\s]+critical/i.test(text) || /\bcritical\s+severity\b/i.test(text)) return 'critical';
  if (/severity[:\s]+high/i.test(text) || /\bhigh\s+severity\b/i.test(text)) return 'high';
  if (/severity[:\s]+medium/i.test(text) || /\bmedium\s+severity\b/i.test(text)) return 'medium';
  if (/severity[:\s]+low/i.test(text) || /\blow\s+severity\b/i.test(text)) return 'low';

  return null;
}


