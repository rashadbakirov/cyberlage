// © 2025 CyberLage
/**
 * BSI CSAF Detail Fetcher (V3)
 *
 * Fetches full CSAF (Common Security Advisory Framework) JSON documents
 * from BSI's public CSAF endpoint. This gives us 10-50x more content
 * than the RSS summary alone.
 *
 * BSI CSAF endpoint pattern:
 *   https://wid.cert-bund.de/.well-known/csaf/white/YEAR/wid-sec-YEAR-NNNN.json
 *
 * Example:
 *   WID-SEC-2026-0201 -> https://wid.cert-bund.de/.well-known/csaf/white/2026/wid-sec-2026-0201.json
 *
 * CSAF JSON contains:
 *   - document.title (full German title)
 *   - document.notes[] (detailed description, affected systems, recommendations)
 *   - vulnerabilities[] (each CVE with CVSS, description, remediation)
 *   - product_tree (affected products with versions)
 */

export interface CsafResult {
  fullDescription: string | null;     // combined notes text
  recommendations: string | null;     // remediation/mitigation text
  affectedVersions: string[];         // specific version strings
  csafSeverity: string | null;        // from CSAF aggregate_severity
  fetchSuccess: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract the WID-SEC-YYYY-NNNN identifier from alert description or title.
 */
export function extractWidId(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/WID-SEC-(\d{4})-(\d+)/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Fetch full CSAF advisory detail from BSI.
 */
export async function fetchBsiCsaf(widId: string): Promise<CsafResult> {
  const match = widId.match(/WID-SEC-(\d{4})-(\d+)/i);
  if (!match) {
    return { fullDescription: null, recommendations: null, affectedVersions: [], csafSeverity: null, fetchSuccess: false };
  }

  const year = match[1];
  const num = match[2].padStart(4, '0');
  const url = `https://wid.cert-bund.de/.well-known/csaf/white/${year}/wid-sec-${year}-${num}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CyberRadar-DE/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 sec timeout
    });

    if (!response.ok) {
      console.warn(`BSI CSAF fetch failed for ${widId}: ${response.status}`);
      return { fullDescription: null, recommendations: null, affectedVersions: [], csafSeverity: null, fetchSuccess: false };
    }

    const csaf: any = await response.json();

    // Extract detailed description from notes
    const notes: any[] = csaf?.document?.notes || [];
    const descriptionNotes = notes
      .filter((n: any) => ['description', 'summary', 'details', 'general'].includes(n.category))
      .map((n: any) => n.text)
      .join('\n\n');

    // Extract recommendations (often category='description' with title containing 'empfehlung')
    const recoNotes = notes
      .filter((n: any) =>
        n.category === 'description' &&
        (n.title?.toLowerCase().includes('empfehlung') ||
         n.title?.toLowerCase().includes('workaround') ||
         n.title?.toLowerCase().includes('remediation') ||
         n.title?.toLowerCase().includes('mitigation'))
      )
      .map((n: any) => n.text)
      .join('\n');

    // If no specific reco notes found, try vulnerability-level remediation
    let recommendations = recoNotes || null;
    if (!recommendations) {
      const vulns: any[] = csaf?.vulnerabilities || [];
      const remediations = vulns
        .flatMap((v: any) => v.remediations || [])
        .map((r: any) => `${r.category || ''}: ${r.details || ''}`.trim())
        .filter((r: string) => r.length > 5);
      if (remediations.length > 0) {
        recommendations = remediations.slice(0, 5).join('\n');
      }
    }

    // Extract specific affected product versions
    const versions: string[] = [];
    const productTree = csaf?.product_tree;
    if (productTree?.branches) {
      extractVersions(productTree.branches, versions);
    }

    // Extract aggregate severity
    const csafSeverity = csaf?.document?.aggregate_severity?.text || null;

    return {
      fullDescription: descriptionNotes || null,
      recommendations,
      affectedVersions: versions.slice(0, 30), // cap at 30
      csafSeverity,
      fetchSuccess: true,
    };
  } catch (err: any) {
    console.warn(`BSI CSAF fetch error for ${widId}: ${err?.message || err}`);
    return { fullDescription: null, recommendations: null, affectedVersions: [], csafSeverity: null, fetchSuccess: false };
  }
}

/**
 * Helper: recursively extract product version strings from CSAF product_tree branches.
 */
function extractVersions(branches: any[], versions: string[]): void {
  for (const branch of branches) {
    if (branch.category === 'product_version' && branch.name) {
      versions.push(branch.name);
    }
    if (branch.branches) {
      extractVersions(branch.branches, versions);
    }
  }
}

/**
 * Batch fetch CSAF for multiple BSI alerts.
 * Rate-limited to 1 request per 500ms to be polite to BSI servers.
 */
export async function fetchCsafBatch(
  alerts: Array<{ id: string; description?: string | null; title?: string | null }>,
  onProgress?: (i: number, total: number, widId: string, success: boolean) => void,
): Promise<Map<string, CsafResult>> {
  const results = new Map<string, CsafResult>();

  for (let i = 0; i < alerts.length; i++) {
    const alert = alerts[i];
    const widId = extractWidId(alert.description) || extractWidId(alert.title);

    if (!widId) {
      continue; // No WID ID found, skip
    }

    const csaf = await fetchBsiCsaf(widId);
    results.set(alert.id, csaf);

    if (onProgress) {
      onProgress(i + 1, alerts.length, widId, csaf.fetchSuccess);
    }

    // Rate limit: 500ms between requests
    if (i < alerts.length - 1) {
      await sleep(500);
    }
  }

  return results;
}


