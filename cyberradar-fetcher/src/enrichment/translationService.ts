// © 2025 CyberLage
/**
 * Compatibility localization service
 *
 * Main branch is English-first. We keep legacy fields (`titleDe`, `summaryDe`)
 * for schema compatibility, but fill them with English content.
 */

export interface TranslationInput {
  id: string;
  title: string;
  summary: string;
  sourceLanguage: string;
}

export interface TranslationOutput {
  id: string;
  titleDe: string;
  summaryDe: string;
}

/**
 * Fill compatibility fields with English text.
 */
export async function translateBatch(
  items: TranslationInput[]
): Promise<TranslationOutput[]> {
  return items.map(item => ({
    id: item.id,
    titleDe: item.title || "",
    summaryDe: item.summary || "",
  }));
}

/**
 * Validate compatibility field quality.
 */
export function validateTranslation(
  original: { title: string; summary: string; cveIds: string[]; affectedVendors: string[] },
  translated: { titleDe: string; summaryDe: string }
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 1. CVE IDs must stay present.
  for (const cve of original.cveIds) {
    if (original.title.includes(cve) && !translated.titleDe.includes(cve)) {
      warnings.push(`CVE ${cve} missing from titleDe`);
    }
  }

  // 2. Vendor names should remain visible.
  for (const vendor of original.affectedVendors) {
    if (vendor.length > 3) {
      const inTitle = translated.titleDe.toLowerCase().includes(vendor.toLowerCase());
      const inSummary = translated.summaryDe?.toLowerCase().includes(vendor.toLowerCase());
      if (!inTitle && !inSummary) {
        warnings.push(`Vendor "${vendor}" missing from compatibility fields`);
      }
    }
  }

  // 3. Length sanity check.
  const titleRatio = translated.titleDe.length / Math.max(original.title.length, 1);
  if (titleRatio > 2.0) warnings.push(`titleDe is ${Math.round(titleRatio * 100)}% of original - possibly expanded too much`);
  if (titleRatio < 0.3) warnings.push(`titleDe is only ${Math.round(titleRatio * 100)}% of original - possibly truncated`);

  return { valid: warnings.length === 0, warnings };
}
