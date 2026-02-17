// © 2025 CyberLage
/**
 * Microsoft Security Response Center (MSRC) parser
 * Source: https://api.msrc.microsoft.com/cvrf/v3.0/updates
 * Type: JSON API (CVRF data as JSON)
 */

import axios from 'axios';
import { subDays } from 'date-fns';
import { PartialAlert } from '../types/schema';
import { cvssToSeverity, extractCVEs } from '../utils/extractors';
import { SourceFetchResult } from '../types/fetch-result';

const SOURCE_ID = 'microsoft-msrc';
const UPDATES_URL = 'https://api.msrc.microsoft.com/cvrf/v3.0/updates';

interface MSRCUpdateSummary {
  ID: string;
  DocumentTitle: string;
  Severity: string | null;
  InitialReleaseDate: string;
  CurrentReleaseDate: string;
  CvrfUrl: string;
}

interface MSRCUpdatesResponse {
  value: MSRCUpdateSummary[];
}

interface MSRCFullProductName {
  ProductID: string;
  Value: string;
}

interface MSRCProductStatus {
  ProductID: string[];
  Type: number;
}

interface MSRCVulnerabilityNote {
  Title: string;
  Type: number;
  Ordinal: string;
  Value?: string;
}

interface MSRCVulnerabilityThreat {
  Description?: { Value?: string };
  Type: number;
}

interface MSRCCvssScoreSet {
  BaseScore: number;
  TemporalScore?: number;
  Vector?: string;
}

interface MSRCVulnerability {
  CVE?: string;
  Title?: { Value?: string };
  Notes?: MSRCVulnerabilityNote[];
  ProductStatuses?: MSRCProductStatus[];
  Threats?: MSRCVulnerabilityThreat[];
  CVSSScoreSets?: MSRCCvssScoreSet[];
}

interface MSRCCvrfDocument {
  DocumentTitle?: { Value?: string };
  DocumentTracking?: {
    InitialReleaseDate?: string;
    CurrentReleaseDate?: string;
  };
  ProductTree?: {
    FullProductName?: MSRCFullProductName[];
  };
  Vulnerability?: MSRCVulnerability[];
}

export async function fetchMicrosoftMSRC(): Promise<SourceFetchResult> {
  const cutoffDate = subDays(new Date(), 14);

  const updatesResponse = await axios.get<MSRCUpdatesResponse>(UPDATES_URL, {
    timeout: 30000,
    headers: {
      'User-Agent': 'CyberRadar-Fetcher/1.0',
      Accept: 'application/json',
    },
  });

  const recentUpdates = (updatesResponse.data.value || []).filter(update => {
    const current = parseIsoAssumeUtc(update.CurrentReleaseDate) ?? parseIsoAssumeUtc(update.InitialReleaseDate) ?? new Date();
    return current >= cutoffDate;
  });

  const alerts: PartialAlert[] = [];
  const rawDocuments: Record<string, any> = {};

  for (const update of recentUpdates) {
    const cvrfResponse = await axios.get<MSRCCvrfDocument>(update.CvrfUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'CyberRadar-Fetcher/1.0',
        Accept: 'application/json',
      },
    });

    const doc = cvrfResponse.data;
    rawDocuments[update.ID] = doc;
    const publishedAtDate =
      parseIsoAssumeUtc(doc.DocumentTracking?.CurrentReleaseDate) ??
      parseIsoAssumeUtc(doc.DocumentTracking?.InitialReleaseDate) ??
      parseIsoAssumeUtc(update.CurrentReleaseDate) ??
      parseIsoAssumeUtc(update.InitialReleaseDate) ??
      new Date();

    const publishedAt = publishedAtDate.toISOString();

    const productNamesById = new Map<string, string>();
    for (const product of doc.ProductTree?.FullProductName || []) {
      if (product.ProductID && product.Value) {
        productNamesById.set(product.ProductID, product.Value);
      }
    }

    for (const vuln of doc.Vulnerability || []) {
      const cve = vuln.CVE ? vuln.CVE.toUpperCase() : null;
      const title = vuln.Title?.Value?.trim() || (cve ? `Microsoft security update — ${cve}` : update.DocumentTitle);

      const noteText = extractNoteText(vuln.Notes || []);
      const combinedText = [update.DocumentTitle, title, noteText].filter(Boolean).join('\n\n');

      const cvssScore = typeof vuln.CVSSScoreSets?.[0]?.BaseScore === 'number' ? vuln.CVSSScoreSets[0].BaseScore : null;
      const cvssVector = vuln.CVSSScoreSets?.[0]?.Vector || null;
      const severity = cvssToSeverity(cvssScore);

      const isActivelyExploited = isExploitedInThreats(vuln.Threats || []);
      const isZeroDay = /(^|\\W)(zero[-\\s]?day|0-day)(\\W|$)/i.test(combinedText);

      const affectedProductIds = collectAffectedProductIds(vuln.ProductStatuses || []);
      const affectedProducts = affectedProductIds
        .map(productId => productNamesById.get(productId) || productId)
        .filter(Boolean);

      const sourceUrl = cve
        ? `https://msrc.microsoft.com/update-guide/en-US/vulnerability/${cve}`
        : update.CvrfUrl;

      const alert: PartialAlert = {
        sourceId: SOURCE_ID,
        sourceName: 'Microsoft Security Response Center',
        sourceCategory: 'vendor',
        sourceTrustTier: 1,
        sourceUrl,
        sourceLanguage: 'en',

        publishedAt,

        title,
        titleDe: null,
        description: stripHtml(combinedText).slice(0, 50000),
        descriptionDe: null,
        summary: null,
        summaryDe: null,

        alertType: 'advisory',
        alertSubType: null,

        severity,
        cvssScore,
        cvssVector,
        isActivelyExploited,
        isZeroDay,

        aiScore: null,
        aiScoreReasoning: null,

        cveIds: cve ? [cve] : extractCVEs(combinedText),
        affectedVendors: ['Microsoft'],
        affectedProducts,
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
  }

  return {
    alerts,
    rawCache: [
      {
        label: 'updates+documents',
        url: UPDATES_URL,
        contentType: 'application/json',
        extension: 'json',
        body: JSON.stringify(
          {
            fetchedAt: new Date().toISOString(),
            updates: recentUpdates,
            documents: rawDocuments,
          },
          null,
          2
        ),
      },
    ],
  };
}

function parseIsoAssumeUtc(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const hasTimezone = /[zZ]$|[+-]\\d{2}:?\\d{2}$/.test(trimmed);
  const normalized = hasTimezone ? trimmed : `${trimmed}Z`;
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

function collectAffectedProductIds(statuses: MSRCProductStatus[]): string[] {
  const ids = new Set<string>();
  for (const status of statuses) {
    for (const productId of status.ProductID || []) {
      if (productId) ids.add(productId);
    }
  }
  return Array.from(ids);
}

function extractNoteText(notes: MSRCVulnerabilityNote[]): string {
  const values: string[] = [];

  for (const note of notes) {
    const title = note.Title?.trim();
    const value = note.Value?.trim();
    if (!title && !value) continue;

    if (value) {
      values.push(title ? `${title}:\n${value}` : value);
    } else if (title) {
      values.push(title);
    }
  }

  return values.join('\n\n');
}

function isExploitedInThreats(threats: MSRCVulnerabilityThreat[]): boolean {
  const combined = threats
    .map(t => t.Description?.Value)
    .filter((v): v is string => Boolean(v))
    .join(' | ')
    .toLowerCase();

  return combined.includes('exploited:yes') || combined.includes('exploited:true');
}

function stripHtml(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\\s+/g, ' ')
    .trim();
}


