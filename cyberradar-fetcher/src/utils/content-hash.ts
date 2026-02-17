// © 2025 CyberLage
import { createHash } from 'crypto';
import { PartialAlert } from '../types/schema';

/**
 * Compute SHA-256 content hash for deduplication
 * Hash is based on: sourceId + title + cveIds + sourceUrl
 */
export function computeContentHash(alert: Partial<PartialAlert>): string {
  const input = [
    alert.sourceId || '',
    alert.title?.toLowerCase().trim() || '',
    (alert.cveIds || []).sort().join(','),
    alert.sourceUrl || '',
  ].join('|');

  return createHash('sha256').update(input, 'utf8').digest('hex');
}


