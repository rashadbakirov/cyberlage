// © 2025 CyberLage
import { CyberRadarAlert } from '../types/schema';
import { AIEnrichmentV2Result } from '../types/enrichment';

function cleanJsonText(text: string): string {
  return text.replace(/```json\\s*/g, '').replace(/```\\s*/g, '').trim();
}

export function applyEnrichmentParsed(alert: CyberRadarAlert, parsed: AIEnrichmentV2Result): CyberRadarAlert {
  // SEVERITY — always set (prompt requires it)
  if (parsed.severity) {
    alert.severity = parsed.severity.toLowerCase() as any;
  }

  // AI SCORE
  if (typeof parsed.aiScore === 'number') {
    alert.aiScore = Math.min(100, Math.max(0, Math.round(parsed.aiScore)));
  }
  alert.aiScoreReasoning = parsed.aiScoreReasoning || null;

  // SUMMARIES + TRANSLATION
  alert.summary = parsed.summary || alert.summary;
  alert.summaryDe = parsed.summaryDe || alert.summaryDe;
  alert.titleDe = parsed.titleDe || alert.titleDe || alert.title;

  // COMPLIANCE — replace entirely with new mapping
  alert.compliance = {
    nis2: (parsed as any).compliance?.nis2 ?? null,
    dora: (parsed as any).compliance?.dora ?? null,
    gdpr: (parsed as any).compliance?.gdpr ?? null,
    iso27001: null,
    aiAct: null,
    sectors: null,
  } as any;

  // Mark as (re-)enriched
  alert.isProcessed = true;
  alert.processingState = 'enriched';
  alert.enrichmentVersion = 2;
  alert.updatedAt = new Date().toISOString();

  return alert;
}

// Parse GPT-4o response and apply to alert document
export function applyEnrichment(alert: CyberRadarAlert, aiResponse: string): CyberRadarAlert {
  try {
    const cleaned = cleanJsonText(aiResponse);
    const parsed: AIEnrichmentV2Result = JSON.parse(cleaned);
    return applyEnrichmentParsed(alert, parsed);
  } catch (err) {
    console.error(`Failed to parse AI response for alert ${alert.id}: ${err}`);
    return alert; // Return unchanged if parse fails
  }
}

// Deterministic severity fallback — runs AFTER AI enrichment
export function ensureSeverity(alert: CyberRadarAlert): void {
  const current = typeof alert.severity === 'string' ? alert.severity.toLowerCase() : null;
  if (current && current !== 'null') return;

  // Fallback 1: Use CVSS score
  if (alert.cvssScore !== null && alert.cvssScore !== undefined) {
    if (alert.cvssScore >= 9.0) alert.severity = 'critical';
    else if (alert.cvssScore >= 7.0) alert.severity = 'high';
    else if (alert.cvssScore >= 4.0) alert.severity = 'medium';
    else alert.severity = 'low';
    return;
  }

  // Fallback 2: Use AI score
  if (alert.aiScore !== null && alert.aiScore !== undefined) {
    if (alert.aiScore >= 85) alert.severity = 'critical';
    else if (alert.aiScore >= 70) alert.severity = 'high';
    else if (alert.aiScore >= 45) alert.severity = 'medium';
    else alert.severity = 'low';
    return;
  }

  // Fallback 3: Default to medium
  alert.severity = 'medium';
}



