// © 2025 CyberLage
import { CyberRadarAlert } from '../types/schema';
import { AIEnrichmentV3Result } from '../types/enrichment';

export function applyEnrichmentParsedV3(alert: CyberRadarAlert, parsed: AIEnrichmentV3Result): CyberRadarAlert {
  alert.summary = parsed.summary || alert.summary;
  alert.summaryDe = parsed.summaryDe || alert.summaryDe;
  alert.titleDe = parsed.titleDe || alert.titleDe || alert.title;

  alert.compliance = {
    nis2: (parsed as any).compliance?.nis2 ?? null,
    dora: (parsed as any).compliance?.dora ?? null,
    gdpr: (parsed as any).compliance?.gdpr ?? null,
    iso27001: null,
    aiAct: null,
    sectors: null,
  } as any;

  alert.isProcessed = true;
  alert.processingState = 'enriched';
  alert.enrichmentVersion = 3;
  alert.updatedAt = new Date().toISOString();

  return alert;
}



