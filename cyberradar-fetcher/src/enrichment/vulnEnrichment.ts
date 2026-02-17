// © 2025 CyberLage
/**
 * Vulnerability enrichment helpers:
 * - CVSS (NVD API v2.0) — per CVE, rate-limited
 * - EPSS (FIRST.org) — batched per alert
 */

export interface NvdResult {
  cvssScore: number | null;
  cvssVector: string | null;
  cvssCveId: string | null; // which CVE had the highest score
}

export interface EpssResult {
  epssScore: number | null; // probability 0.0-1.0
  epssPercentile: number | null; // percentile 0.0-1.0
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeCveId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

function uniqueKeepOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

const NVD_CACHE = new Map<string, { score: number | null; vector: string | null }>();

function parseNvdCvss(data: any): { score: number | null; vector: string | null } {
  const metrics = data?.vulnerabilities?.[0]?.cve?.metrics;

  const v31 = metrics?.cvssMetricV31?.[0]?.cvssData;
  if (v31 && typeof v31.baseScore === 'number') {
    return {
      score: v31.baseScore,
      vector: typeof v31.vectorString === 'string' ? v31.vectorString : null,
    };
  }

  const v30 = metrics?.cvssMetricV30?.[0]?.cvssData;
  if (v30 && typeof v30.baseScore === 'number') {
    return {
      score: v30.baseScore,
      vector: typeof v30.vectorString === 'string' ? v30.vectorString : null,
    };
  }

  const v2 = metrics?.cvssMetricV2?.[0]?.cvssData;
  if (v2 && typeof v2.baseScore === 'number') {
    return {
      score: v2.baseScore,
      vector: typeof v2.vectorString === 'string' ? v2.vectorString : null,
    };
  }

  return { score: null, vector: null };
}

async function fetchNvdForCve(cveId: string): Promise<{ score: number | null; vector: string | null } | null> {
  // Use cache when possible to reduce API calls.
  const cached = NVD_CACHE.get(cveId);
  if (cached) return cached;

  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`;

  const headers: Record<string, string> = {
    'User-Agent': 'CyberRadar-DE/1.0 (security-intelligence-platform)',
    Accept: 'application/json',
  };
  if (process.env.NVD_API_KEY) headers.apiKey = process.env.NVD_API_KEY;

  const doFetch = async (): Promise<Response> => fetch(url, { headers });

  let response: Response;
  try {
    response = await doFetch();
  } catch (err) {
    console.warn(`NVD lookup failed for ${cveId}: ${err}`);
    return null;
  }

  // Rate limited/blocked — wait then retry once
  if (response.status === 403 || response.status === 429) {
    await sleep(6000);
    try {
      response = await doFetch();
    } catch (err) {
      console.warn(`NVD retry failed for ${cveId}: ${err}`);
      return null;
    }
  }

  if (!response.ok) return null;

  let json: any;
  try {
    json = await response.json();
  } catch (err) {
    console.warn(`NVD JSON parse failed for ${cveId}: ${err}`);
    return null;
  }

  const parsed = parseNvdCvss(json);
  NVD_CACHE.set(cveId, parsed);
  return parsed;
}

/**
 * NVD CVSS Enrichment — per alert.
 * Looks up each CVE (up to first 20) and returns the HIGHEST CVSS score.
 */
export async function enrichCvss(cveIds: string[]): Promise<NvdResult> {
  if (!Array.isArray(cveIds) || cveIds.length === 0) {
    return { cvssScore: null, cvssVector: null, cvssCveId: null };
  }

  const normalized = cveIds
    .map(normalizeCveId)
    .filter((v): v is string => typeof v === 'string');

  // For alerts with many CVEs (>20), only check first 20 to save API calls.
  const cveSubset = uniqueKeepOrder(normalized).slice(0, 20);

  let highest: NvdResult = { cvssScore: null, cvssVector: null, cvssCveId: null };

  for (const cveId of cveSubset) {
    try {
      const cached = NVD_CACHE.get(cveId);
      const info = cached ? cached : await fetchNvdForCve(cveId);
      const score = info?.score ?? null;
      const vector = info?.vector ?? null;

      if (score !== null && (highest.cvssScore === null || score > highest.cvssScore)) {
        highest = { cvssScore: score, cvssVector: vector, cvssCveId: cveId };
      }

      // Early stop if we hit the maximum possible CVSS base score.
      if (highest.cvssScore === 10) break;

      // Rate limit only when we had to query NVD (skip delay for cached CVEs).
      if (!cached) {
        // Rate limit: 5 requests per 30 sec (no API key) ~= 1 per 6 sec.
        // With API key: 50 per 30 sec ~= 1 per 0.6 sec.
        await sleep(process.env.NVD_API_KEY ? 700 : 6500);
      }
    } catch (err) {
      console.warn(`NVD lookup failed for ${cveId}: ${err}`);
    }
  }

  return highest;
}

/**
 * EPSS Enrichment — FIRST.org API.
 * Batch query (up to 100 CVEs) and return the HIGHEST EPSS score.
 */
export async function enrichEpss(cveIds: string[]): Promise<EpssResult> {
  if (!Array.isArray(cveIds) || cveIds.length === 0) {
    return { epssScore: null, epssPercentile: null };
  }

  const normalized = uniqueKeepOrder(
    cveIds
      .map(normalizeCveId)
      .filter((v): v is string => typeof v === 'string')
  );
  if (normalized.length === 0) return { epssScore: null, epssPercentile: null };

  try {
    const batch = normalized.slice(0, 100).join(',');
    const url = `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(batch)}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'CyberRadar-DE/1.0', Accept: 'application/json' },
    });

    if (!response.ok) {
      console.warn(`EPSS API error: ${response.status}`);
      return { epssScore: null, epssPercentile: null };
    }

    const data: any = await response.json();
    const results = data?.data;
    if (!Array.isArray(results) || results.length === 0) {
      return { epssScore: null, epssPercentile: null };
    }

    let highest: { epssScore: number; epssPercentile: number } = { epssScore: 0, epssPercentile: 0 };
    for (const entry of results) {
      const score = typeof entry?.epss === 'string' ? Number.parseFloat(entry.epss) : Number(entry?.epss);
      const percentile = typeof entry?.percentile === 'string' ? Number.parseFloat(entry.percentile) : Number(entry?.percentile);

      if (!Number.isFinite(score)) continue;
      const pct = Number.isFinite(percentile) ? percentile : 0;

      if (score > highest.epssScore) {
        highest = { epssScore: score, epssPercentile: pct };
      }
    }

    return highest.epssScore > 0 ? highest : { epssScore: null, epssPercentile: null };
  } catch (err) {
    console.warn(`EPSS enrichment failed: ${err}`);
    return { epssScore: null, epssPercentile: null };
  }
}


