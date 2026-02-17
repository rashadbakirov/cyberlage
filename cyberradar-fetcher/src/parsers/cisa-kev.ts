// © 2025 CyberLage
/**
 * CISA Known Exploited Vulnerabilities (KEV) Parser
 * Source: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
 * Type: JSON Feed
 */

import axios from 'axios';
import { PartialAlert } from '../types/schema';
import { extractCVEs, normalizeVendor, cvssToSeverity } from '../utils/extractors';
import { subDays } from 'date-fns';
import { SourceFetchResult } from '../types/fetch-result';

const SOURCE_ID = 'cisa-kev';
const SOURCE_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

interface KEVEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
  notes?: string;
}

interface KEVResponse {
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KEVEntry[];
}

export async function fetchCISAKEV(): Promise<SourceFetchResult> {
  const response = await axios.get<KEVResponse>(SOURCE_URL, {
    timeout: 30000,
    headers: { 'User-Agent': 'CyberRadar-Fetcher/1.0' },
  });
  const data = response.data;

  const alerts: PartialAlert[] = [];
  const cutoffDate = subDays(new Date(), 14); // Only fetch entries from last 14 days

  for (const entry of data.vulnerabilities) {
    const dateAdded = new Date(entry.dateAdded);

    // Filter: only last 14 days
    if (dateAdded < cutoffDate) continue;

    const alert: PartialAlert = {
      sourceId: SOURCE_ID,
      sourceName: 'CISA Known Exploited Vulnerabilities Catalog',
      sourceCategory: 'government',
      sourceTrustTier: 1,
      sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      sourceLanguage: 'en',

      publishedAt: dateAdded.toISOString(),

      title: `${entry.vendorProject} ${entry.product} — ${entry.vulnerabilityName}`,
      titleDe: null,
      description: `${entry.shortDescription}\n\nRequired Action: ${entry.requiredAction}${entry.notes ? `\n\nNotes: ${entry.notes}` : ''}`,
      descriptionDe: null,
      summary: null,
      summaryDe: null,

      alertType: 'exploit',
      alertSubType: entry.knownRansomwareCampaignUse === 'Known' ? 'ransomware' : null,

      severity: null, // Will be enriched from NVD in second pass
      cvssScore: null,
      cvssVector: null,
      isActivelyExploited: true, // ALL KEV entries are actively exploited
      isZeroDay: false, // We don't have enough data to determine this

      aiScore: null,
      aiScoreReasoning: null,

      cveIds: [entry.cveID],
      affectedVendors: [normalizeVendor(entry.vendorProject)],
      affectedProducts: [entry.product],
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
      rawContentType: 'json',
    };

    alerts.push(alert);
  }

  return {
    alerts,
    rawCache: [
      {
        label: 'feed',
        url: SOURCE_URL,
        contentType: 'application/json',
        extension: 'json',
        body: JSON.stringify(data, null, 2),
      },
    ],
  };
}


