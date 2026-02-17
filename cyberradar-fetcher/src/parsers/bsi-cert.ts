// © 2025 CyberLage
/**
 * BSI CERT-Bund Security Advisories Parser
 * Source: https://wid.cert-bund.de/content/public/securityAdvisory
 * Type: Public JSON API (German language)
 */

import axios from 'axios';
import { PartialAlert } from '../types/schema';
import { extractCVEs, extractVendors } from '../utils/extractors';
import { subDays } from 'date-fns';
import { SourceFetchResult } from '../types/fetch-result';

const SOURCE_ID = 'bsi-cert';
const SOURCE_URL = 'https://wid.cert-bund.de/content/public/securityAdvisory';

interface WIDSecurityAdvisorySummary {
  uuid: string;
  name: string;
  temporalscore: number | null;
  basescore: number | null;
  classification: string | null;
  published: string;
  status: string | null;
  title: string | null;
  productNames?: string[];
  cves?: string[];
  noPatch?: boolean;
}

interface WIDPage<T> {
  content: T[];
  last: boolean;
  number: number;
  size: number;
}

export async function fetchBSICERT(): Promise<SourceFetchResult> {
  const alerts: PartialAlert[] = [];
  const cutoffDate = subDays(new Date(), 14);
  const rawPages: any[] = [];

  let page = 0;
  const pageSize = 200;
  const maxPages = 25; // Safety guard

  while (page < maxPages) {
    const response = await axios.get<WIDPage<WIDSecurityAdvisorySummary>>(SOURCE_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'CyberRadar-Fetcher/1.0',
        Accept: 'application/json',
      },
      params: {
        page,
        size: pageSize,
        sort: 'published,desc',
      },
    });

    const data = response.data;
    rawPages.push({ page, size: pageSize, last: data.last, number: data.number, contentCount: data.content?.length ?? 0, data });

    for (const item of data.content) {
      const pubDate = item.published ? new Date(item.published) : new Date();

      // Sorted by published desc; once we go below cutoff we can stop.
      if (pubDate < cutoffDate) {
        return {
          alerts,
          rawCache: [
            {
              label: 'pages',
              url: SOURCE_URL,
              contentType: 'application/json',
              extension: 'json',
              body: JSON.stringify(
                {
                  fetchedAt: new Date().toISOString(),
                  sort: 'published,desc',
                  pageSize,
                  pagesFetched: rawPages.length,
                  pages: rawPages,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const title = item.title || item.name || 'Untitled';
      const products = (item.productNames || []).filter(Boolean);
      const cveIds = (item.cves || []).filter(Boolean).map(cve => cve.toUpperCase());

      const descriptionParts: string[] = [
        `WID ID: ${item.name}`,
        item.status ? `Status: ${item.status}` : null,
        item.classification ? `Classification: ${item.classification}` : null,
        typeof item.basescore === 'number' ? `Base score (0-100): ${item.basescore}` : null,
        typeof item.temporalscore === 'number' ? `Temporal score (0-100): ${item.temporalscore}` : null,
        item.noPatch ? `No patch available: yes` : null,
        cveIds.length ? `CVEs: ${cveIds.join(', ')}` : null,
        products.length ? `Products: ${products.join(', ')}` : null,
      ].filter((p): p is string => Boolean(p));

      const description = descriptionParts.join('\n');

      const vendors = extractVendors([title, ...products].join(' '));

      const severity = mapClassificationToSeverity(item.classification, title + ' ' + description);

      const combinedText = title + ' ' + description;
      const alertType = determineAlertTypeDE(combinedText);

      const isZeroDay = combinedText.toLowerCase().includes('zero-day') || combinedText.toLowerCase().includes('0-day');

      const alert: PartialAlert = {
        sourceId: SOURCE_ID,
        sourceName: 'BSI CERT-Bund (WID) Sicherheitshinweise',
        sourceCategory: 'government',
        sourceTrustTier: 1,
        sourceUrl: 'https://wid.cert-bund.de/portal/',
        sourceLanguage: 'de',

        publishedAt: pubDate.toISOString(),

        title,
        titleDe: null, // Already in German
        description: description.slice(0, 50000), // Truncate if too long
        descriptionDe: null,
        summary: null,
        summaryDe: null,

        alertType,
        alertSubType: null,

        severity,
        cvssScore: null,
        cvssVector: null,
        isActivelyExploited: false,
        isZeroDay,

        aiScore: null,
        aiScoreReasoning: null,

        cveIds: cveIds.length ? cveIds : extractCVEs(combinedText),
        affectedVendors: vendors,
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

    if (data.last) break;
    page += 1;
  }

  return {
    alerts,
    rawCache: [
      {
        label: 'pages',
        url: SOURCE_URL,
        contentType: 'application/json',
        extension: 'json',
        body: JSON.stringify(
          {
            fetchedAt: new Date().toISOString(),
            sort: 'published,desc',
            pageSize,
            pagesFetched: rawPages.length,
            pages: rawPages,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Determine severity from German text
 * BSI uses "Bedrohungsstufe" 1-5 or keywords
 */
function determineSeverityDE(text: string): 'critical' | 'high' | 'medium' | 'low' | 'info' | null {
  const lower = text.toLowerCase();

  // Check for explicit severity keywords
  if (lower.includes('kritisch') || lower.includes('stufe 5') || lower.includes('stufe 4')) {
    return 'critical';
  }
  if (lower.includes('hoch') || lower.includes('stufe 3')) {
    return 'high';
  }
  if (lower.includes('mittel') || lower.includes('stufe 2')) {
    return 'medium';
  }
  if (lower.includes('niedrig') || lower.includes('gering') || lower.includes('stufe 1')) {
    return 'low';
  }
  if (lower.includes('informativ') || lower.includes('hinweis')) {
    return 'info';
  }

  return null;
}

function mapClassificationToSeverity(
  classification: string | null | undefined,
  fallbackText: string
): 'critical' | 'high' | 'medium' | 'low' | 'info' | null {
  const normalized = classification?.toLowerCase().trim() || null;

  if (normalized) {
    if (normalized.includes('krit') || normalized.includes('sehr hoch')) return 'critical';
    if (normalized.includes('hoch')) return 'high';
    if (normalized.includes('mittel')) return 'medium';
    if (normalized.includes('niedrig') || normalized.includes('gering')) return 'low';
    if (normalized.includes('info')) return 'info';
  }

  return determineSeverityDE(fallbackText);
}

/**
 * Determine alert type from German text
 */
function determineAlertTypeDE(text: string): any {
  const lower = text.toLowerCase();

  if (lower.includes('sicherheitslücke') || lower.includes('schwachstelle') || lower.includes('cve-')) {
    return 'vulnerability';
  }
  if (lower.includes('angriff') || lower.includes('ausgenutzt') || lower.includes('zero-day')) {
    return 'exploit';
  }
  if (lower.includes('ransomware') || lower.includes('malware') || lower.includes('trojaner') || lower.includes('schadprogramm')) {
    return 'malware';
  }
  if (lower.includes('datenleck') || lower.includes('datenpanne') || lower.includes('datenabfluss')) {
    return 'breach';
  }
  if (lower.includes('sicherheitshinweis') || lower.includes('warnung') || lower.includes('update')) {
    return 'advisory';
  }

  return 'other';
}


