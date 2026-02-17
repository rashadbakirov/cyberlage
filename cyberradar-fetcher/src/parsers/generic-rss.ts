// © 2025 CyberLage
/**
 * Generic RSS Parser
 * Can be used for multiple RSS-based sources with configuration
 */

import { PartialAlert, SourceCategory, AlertType } from '../types/schema';
import { parseRSSWithRaw, extractContent } from '../utils/rss-parser';
import { extractCVEs, extractVendors, extractIoCs, extractSeverityFromText } from '../utils/extractors';
import { subDays } from 'date-fns';
import { SourceFetchResult } from '../types/fetch-result';

export interface RSSSourceConfig {
  sourceId: string;
  sourceName: string;
  sourceCategory: SourceCategory;
  trustTier: 1 | 2 | 3;
  url: string;
  language: 'en' | 'de';
  defaultAlertType?: AlertType;
  defaultAlertSubType?: string;
  daysBack?: number;
  keywordAlertTypeMap?: Record<string, AlertType>;
  includeTitleKeywords?: string[];
  includeLinkSubstrings?: string[];
  excludeLinkSubstrings?: string[];
}

export async function fetchGenericRSS(config: RSSSourceConfig): Promise<SourceFetchResult> {
  const { feed, rawXml } = await parseRSSWithRaw(config.url);
  const alerts: PartialAlert[] = [];
  const cutoffDate = subDays(new Date(), config.daysBack || 14);

  for (const item of feed.items) {
    const pubDate = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : new Date();

    // Filter: only recent items
    if (pubDate < cutoffDate) continue;

    const title = item.title || 'Untitled';

    // Filter: skip sponsored/marketing articles from news sources
    if (config.sourceCategory === 'news' && isSpamTitle(title)) {
      continue;
    }

    // Optional filter: only include items whose title contains at least one keyword
    if (config.includeTitleKeywords?.length) {
      const lowerTitle = title.toLowerCase();
      const matches = config.includeTitleKeywords.some(keyword => lowerTitle.includes(keyword.toLowerCase()));
      if (!matches) continue;
    }

    const description = extractContent(item);
    const link = item.link || config.url;

    if (config.includeLinkSubstrings?.length) {
      const matches = config.includeLinkSubstrings.some(substr => link.includes(substr));
      if (!matches) continue;
    }

    if (config.excludeLinkSubstrings?.length) {
      const matches = config.excludeLinkSubstrings.some(substr => link.includes(substr));
      if (matches) continue;
    }

    const fullText = title + ' ' + description;

    // Extract technical indicators
    const cveIds = extractCVEs(fullText);
    const vendors = extractVendors(fullText);
    const iocs = extractIoCs(description);

    // Determine alert type
    const alertType = determineAlertType(fullText, config);

    // Check for active exploitation
    const isActivelyExploited =
      fullText.toLowerCase().includes('actively exploited') ||
      fullText.toLowerCase().includes('active exploitation') ||
      fullText.toLowerCase().includes('in the wild');

    // Check for zero-day
    const isZeroDay =
      fullText.toLowerCase().includes('zero-day') ||
      fullText.toLowerCase().includes('0-day') ||
      fullText.toLowerCase().includes('zero day');

    // Extract severity from source text as fallback (before NVD enrichment)
    const textSeverity = extractSeverityFromText(fullText);

    const alert: PartialAlert = {
      sourceId: config.sourceId,
      sourceName: config.sourceName,
      sourceCategory: config.sourceCategory,
      sourceTrustTier: config.trustTier,
      sourceUrl: link,
      sourceLanguage: config.language,

      publishedAt: pubDate.toISOString(),

      title,
      titleDe: null,
      description: description.slice(0, 50000),
      descriptionDe: null,
      summary: null,
      summaryDe: null,

      alertType,
      alertSubType: config.defaultAlertSubType ?? determineAlertSubType(fullText),

      severity: textSeverity, // Fallback from text; NVD enrichment will override if CVSS is available
      cvssScore: null,
      cvssVector: null,
      isActivelyExploited,
      isZeroDay,

      aiScore: null,
      aiScoreReasoning: null,

      cveIds,
      affectedVendors: vendors,
      affectedProducts: [],
      affectedVersions: null,
      mitreTactics: [],
      iocs,

      compliance: {
        nis2: null,
        dora: null,
        gdpr: null,
        iso27001: null,
        aiAct: null,
        sectors: null,
      },

      isProcessed: false,
      processingState: 'raw',

      rawBlobPath: null,
      rawContentType: 'rss-xml',
    };

    alerts.push(alert);
  }

  return {
    alerts,
    rawCache: [
      {
        label: 'feed',
        url: config.url,
        contentType: 'application/xml',
        extension: 'xml',
        body: rawXml,
      },
    ],
  };
}

function determineAlertType(text: string, config: RSSSourceConfig): AlertType {
  if (config.defaultAlertType) return config.defaultAlertType;

  const lower = text.toLowerCase();

  // Use custom keyword map if provided
  if (config.keywordAlertTypeMap) {
    for (const [keyword, alertType] of Object.entries(config.keywordAlertTypeMap)) {
      if (lower.includes(keyword.toLowerCase())) {
        return alertType;
      }
    }
  }

  // Default keyword-based classification (order matters: more specific first)
  if (lower.includes('vulnerability') || lower.includes('cve-') || lower.includes('flaw') || lower.includes('security bug') || lower.includes('rce ') || lower.includes('remote code execution') || lower.includes('privilege escalation') || lower.includes('sql injection') || lower.includes('xss') || lower.includes('buffer overflow') || lower.includes('path traversal') || lower.includes('authentication bypass')) {
    return 'vulnerability';
  }
  if (lower.includes('exploit') || lower.includes('zero-day') || lower.includes('0-day') || lower.includes('actively exploited') || lower.includes('active exploitation') || lower.includes('in the wild') || lower.includes('proof of concept') || lower.includes('proof-of-concept') || lower.includes('poc ')) {
    return 'exploit';
  }
  if (lower.includes('ransomware') || lower.includes('malware') || lower.includes('trojan') || lower.includes('backdoor') || lower.includes('botnet') || lower.includes('infostealer') || lower.includes('info-stealer') || lower.includes('info stealer') || lower.includes('keylogger') || lower.includes('rootkit') || lower.includes('wiper') || lower.includes('cryptominer') || lower.includes('crypto miner') || lower.includes('cryptojacking') || lower.includes('spyware') || lower.includes('adware') || lower.includes('worm ') || lower.includes('rat ') || lower.includes('remote access trojan') || lower.includes('c2 server') || lower.includes('c&c') || lower.includes('command and control') || lower.includes('command-and-control')) {
    return 'malware';
  }
  if (lower.includes('apt') || lower.includes('nation-state') || lower.includes('nation state') || lower.includes('espionage') || lower.includes('advanced persistent') || lower.includes('threat actor') || lower.includes('threat group') || lower.includes('state-sponsored') || lower.includes('state sponsored') || lower.includes('cyber espionage') || lower.includes('hackers resume') || lower.includes('hacking group') || lower.includes('hacking campaign') || lower.includes('cyber campaign')) {
    return 'apt';
  }
  if (lower.includes('breach') || lower.includes('leak') || lower.includes('stolen') || lower.includes('data breach') || lower.includes('data exposure') || lower.includes('data leak') || lower.includes('records exposed') || lower.includes('credentials dumped') || lower.includes('compromised accounts') || lower.includes('datenleck')) {
    return 'breach';
  }
  if (lower.includes('advisory') || lower.includes('patch') || lower.includes('security update') || lower.includes('security bulletin') || lower.includes('hotfix') || lower.includes('firmware update') || lower.includes('sicherheitsupdate') || lower.includes('patchday')) {
    return 'advisory';
  }
  if (lower.includes('best practice') || lower.includes('guidance') || lower.includes('framework') || lower.includes('compliance') || lower.includes('mandates') || lower.includes('regulation') || lower.includes('directive') || lower.includes('nist ') || lower.includes('iso 27001') || lower.includes('nis2') || lower.includes('dora ') || lower.includes('security checklist') || lower.includes('hardening guide') || lower.includes('empfehlung') || lower.includes('richtlinie')) {
    return 'guidance';
  }

  return 'other';
}

function determineAlertSubType(text: string): string | null {
  const lower = text.toLowerCase();

  if (lower.includes('ransomware')) return 'ransomware';
  if (lower.includes('supply chain') || lower.includes('supply-chain') || lower.includes('dependency confusion') || lower.includes('typosquatting')) return 'supply-chain';
  if (lower.includes('phishing') || lower.includes('spear-phishing') || lower.includes('credential harvesting')) return 'phishing';
  if (lower.includes('ddos') || lower.includes('denial of service') || lower.includes('denial-of-service')) return 'ddos';
  if (lower.includes('ics') || lower.includes('scada') || lower.includes('industrial control') || lower.includes('plc') || lower.includes('operational technology') || lower.includes(' ot ') || lower.includes('kritis')) return 'ics-ot';

  return null;
}

/**
 * Titles matching these patterns indicate sponsored or marketing content
 * from news sources (THN, BleepingComputer) — should be filtered out.
 */
const SPAM_TITLE_PATTERNS = [
  /buyer'?s?\s+guide/i,
  /\bsponsored\b/i,
  /\bwebinar\b/i,
  /product\s+demo/i,
  /\bebook\b/i,
  /free\s+download/i,
  /\btrial\b.*\bsign\s*up/i,
  /\bwhitepaper\b/i,
  /\binfographic\b/i,
];

function isSpamTitle(title: string): boolean {
  return SPAM_TITLE_PATTERNS.some(pattern => pattern.test(title));
}


