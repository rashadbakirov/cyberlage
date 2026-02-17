// © 2025 CyberLage
/**
 * NIST NVD CVE API client (v2.0)
 * Base URL: https://services.nvd.nist.gov/rest/json/cves/2.0
 */

import axios from 'axios';

const NVD_API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

export interface NvdCvssInfo {
  cveId: string;
  cvssScore: number | null;
  cvssVector: string | null;
  cvssVersion: '3.1' | '3.0' | '2.0' | null;
}

export async function fetchNvdCvssByCveIds(
  cveIds: string[],
  options: {
    apiKey: string | null;
    rateLimitSeconds: number;
    timeoutMs: number;
    maxRequests: number;
  }
): Promise<{ results: Map<string, NvdCvssInfo>; rawResponses: any[]; errorCount: number }> {
  const results = new Map<string, NvdCvssInfo>();
  const rawResponses: any[] = [];
  let errorCount = 0;

  const unique = Array.from(new Set(cveIds.map(c => c.toUpperCase().trim()).filter(Boolean)));

  for (const cveId of unique.slice(0, options.maxRequests)) {
    try {
      const response = await axios.get<any>(NVD_API_URL, {
        timeout: options.timeoutMs,
        headers: {
          'User-Agent': 'CyberRadar-Fetcher/1.0',
          Accept: 'application/json',
          ...(options.apiKey ? { apiKey: options.apiKey } : {}),
        },
        params: { cveId },
      });

      rawResponses.push({ cveId, data: response.data });

      const parsed = parseCvss(response.data, cveId);
      results.set(cveId, parsed);
    } catch (error: any) {
      errorCount += 1;
      rawResponses.push({ cveId, error: error?.message ?? String(error) });
    }

    // Rate limit between requests
    if (options.rateLimitSeconds > 0) {
      await sleep(options.rateLimitSeconds * 1000);
    }
  }

  return { results, rawResponses, errorCount };
}

function parseCvss(data: any, cveId: string): NvdCvssInfo {
  const metrics = data?.vulnerabilities?.[0]?.cve?.metrics;

  // Prefer v3.1, then v3.0, then v2
  const v31 = metrics?.cvssMetricV31?.[0]?.cvssData;
  if (v31 && typeof v31.baseScore === 'number') {
    return {
      cveId,
      cvssScore: v31.baseScore,
      cvssVector: typeof v31.vectorString === 'string' ? v31.vectorString : null,
      cvssVersion: '3.1',
    };
  }

  const v30 = metrics?.cvssMetricV30?.[0]?.cvssData;
  if (v30 && typeof v30.baseScore === 'number') {
    return {
      cveId,
      cvssScore: v30.baseScore,
      cvssVector: typeof v30.vectorString === 'string' ? v30.vectorString : null,
      cvssVersion: '3.0',
    };
  }

  const v2 = metrics?.cvssMetricV2?.[0]?.cvssData;
  if (v2 && typeof v2.baseScore === 'number') {
    return {
      cveId,
      cvssScore: v2.baseScore,
      cvssVector: typeof v2.vectorString === 'string' ? v2.vectorString : null,
      cvssVersion: '2.0',
    };
  }

  return { cveId, cvssScore: null, cvssVector: null, cvssVersion: null };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}



