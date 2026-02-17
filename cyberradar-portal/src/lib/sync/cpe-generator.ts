// © 2025 CyberLage
function norm(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Very lightweight CPE 2.3 generator.
 * This is best-effort and mainly useful for stable matching keys.
 */
export function generateCpe(params: { vendor?: string | null; product?: string | null; version?: string | null }): string | null {
  const vendor = params.vendor ? norm(params.vendor) : "";
  const product = params.product ? norm(params.product) : "";
  if (!vendor || !product) return null;
  const version = params.version ? norm(params.version) : "*";
  return `cpe:2.3:a:${vendor}:${product}:${version}:*:*:*:*:*:*:*`;
}



