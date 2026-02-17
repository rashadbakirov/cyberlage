// © 2025 CyberLage
/**
 * Siemens ProductCERT security advisories (CSAF feed)
 * Feed: https://cert-portal.siemens.com/productcert/csaf/ssa-feed-tlp-white.json
 * Type: JSON feed (ROLIE-style) with CSAF documents per advisory
 */

import axios from 'axios';
import { subDays } from 'date-fns';
import { PartialAlert } from '../types/schema';
import { SourceFetchResult } from '../types/fetch-result';
import { cvssToSeverity, extractCVEs } from '../utils/extractors';

const SOURCE_ID = 'siemens-cert';
const FEED_URL = 'https://cert-portal.siemens.com/productcert/csaf/ssa-feed-tlp-white.json';

interface SiemensCsafFeedEntry {
  id: string; // e.g. "SSA-001536"
  title: string;
  published?: string;
  updated?: string;
  summary?: { content?: string };
  content?: { src?: string; type?: string };
}

interface SiemensCsafFeed {
  feed?: {
    updated?: string;
    entry?: SiemensCsafFeedEntry[];
  };
}

export async function fetchSiemensProductCERT(): Promise<SourceFetchResult> {
  const cutoff = subDays(new Date(), 14);

  const feedResponse = await axios.get<SiemensCsafFeed>(FEED_URL, {
    timeout: 30000,
    headers: {
      'User-Agent': 'CyberRadar-Fetcher/1.0',
      Accept: 'application/json',
    },
  });

  const entries = (feedResponse.data.feed?.entry || []).filter(entry => {
    const updatedAt = parseIso(entry.updated) ?? parseIso(entry.published) ?? new Date();
    return updatedAt >= cutoff;
  });

  const alerts: PartialAlert[] = [];
  const rawCache = [
    {
      label: 'feed-filtered',
      url: FEED_URL,
      contentType: 'application/json',
      extension: 'json' as const,
      body: JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          feedUpdated: feedResponse.data.feed?.updated ?? null,
          entries,
        },
        null,
        2
      ),
    },
  ];

  // Safety guard: limit the number of CSAF documents fetched per cycle.
  const maxDocs = 20;

  for (const entry of entries.slice(0, maxDocs)) {
    const csafUrl = entry.content?.src;
    if (!csafUrl) continue;

    const csafResponse = await axios.get<any>(csafUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'CyberRadar-Fetcher/1.0',
        Accept: 'application/json',
      },
    });

    const doc = csafResponse.data;
    rawCache.push({
      label: `csaf-${entry.id}`,
      url: csafUrl,
      contentType: 'application/json',
      extension: 'json',
      body: JSON.stringify(doc, null, 2),
    });

    const documentTitle: string = doc?.document?.title || entry.title || 'Siemens security advisory';
    const publishedAtDate =
      parseIso(doc?.document?.tracking?.current_release_date) ??
      parseIso(doc?.document?.tracking?.initial_release_date) ??
      parseIso(entry.updated) ??
      parseIso(entry.published) ??
      new Date();

    const notes: any[] = Array.isArray(doc?.document?.notes) ? doc.document.notes : [];
    const noteText = notes
      .map(n => (typeof n?.text === 'string' ? n.text.trim() : null))
      .filter((t): t is string => Boolean(t))
      .join('\n\n');

    const summaryText = entry.summary?.content?.trim() || '';
    const baseDescription = [summaryText, noteText].filter(Boolean).join('\n\n');

    const vulnerabilities: any[] = Array.isArray(doc?.vulnerabilities) ? doc.vulnerabilities : [];
    const cveIds = Array.from(
      new Set(
        vulnerabilities
          .map(v => (typeof v?.cve === 'string' ? v.cve.toUpperCase() : null))
          .filter((c): c is string => Boolean(c))
      )
    );

    const { maxScore, vectorString } = extractMaxCvssFromCsaf(vulnerabilities);
    const severity = cvssToSeverity(maxScore);

    const products = extractProductsFromProductTree(doc?.product_tree).slice(0, 50);

    const combinedText = `${documentTitle}\n\n${baseDescription}\n\n${cveIds.join(', ')}`.trim();
    const isZeroDay = /(^|\\W)(zero[-\\s]?day|0-day)(\\W|$)/i.test(combinedText);

    const advisoryId = normalizeAdvisoryId(entry.id);
    const sourceUrl = advisoryId
      ? `https://cert-portal.siemens.com/productcert/html/ssa-${advisoryId}.html`
      : 'https://www.siemens.com/cert/advisories';

    const alert: PartialAlert = {
      sourceId: SOURCE_ID,
      sourceName: 'Siemens ProductCERT Security Advisories',
      sourceCategory: 'vendor',
      sourceTrustTier: 1,
      sourceUrl,
      sourceLanguage: 'en',

      publishedAt: publishedAtDate.toISOString(),

      title: documentTitle,
      titleDe: null,
      description: baseDescription.slice(0, 50000),
      descriptionDe: null,
      summary: null,
      summaryDe: null,

      alertType: 'advisory',
      alertSubType: 'ics-ot',

      severity,
      cvssScore: maxScore,
      cvssVector: vectorString,
      isActivelyExploited: false,
      isZeroDay,

      aiScore: null,
      aiScoreReasoning: null,

      cveIds: cveIds.length ? cveIds : extractCVEs(combinedText),
      affectedVendors: ['Siemens'],
      affectedProducts: products,
      affectedVersions: null,
      mitreTactics: [],
      iocs: [],

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
      rawContentType: 'api-response',
    };

    alerts.push(alert);
  }

  return { alerts, rawCache };
}

function parseIso(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function normalizeAdvisoryId(id: string | undefined): string | null {
  if (!id) return null;
  const match = id.match(/SSA-(\\d{6})/i);
  return match ? match[1] : null;
}

function extractMaxCvssFromCsaf(vulnerabilities: any[]): { maxScore: number | null; vectorString: string | null } {
  let maxScore: number | null = null;
  let vectorString: string | null = null;

  for (const vulnerability of vulnerabilities) {
    const scores: any[] = Array.isArray(vulnerability?.scores) ? vulnerability.scores : [];
    for (const score of scores) {
      const cvss = score?.cvss_v3;
      const baseScore = typeof cvss?.baseScore === 'number' ? cvss.baseScore : null;
      if (baseScore === null) continue;

      if (maxScore === null || baseScore > maxScore) {
        maxScore = baseScore;
        vectorString = typeof cvss?.vectorString === 'string' ? cvss.vectorString : null;
      }
    }
  }

  return { maxScore, vectorString };
}

function extractProductsFromProductTree(productTree: any): string[] {
  const products = new Set<string>();

  function visitBranch(branch: any) {
    if (!branch || typeof branch !== 'object') return;

    const productName = branch?.product?.name;
    if (typeof productName === 'string' && productName.trim()) {
      products.add(productName.trim());
    }

    const branches: any[] = Array.isArray(branch.branches) ? branch.branches : [];
    for (const child of branches) {
      visitBranch(child);
    }
  }

  const topBranches: any[] = Array.isArray(productTree?.branches) ? productTree.branches : [];
  for (const branch of topBranches) {
    visitBranch(branch);
  }

  return Array.from(products);
}



