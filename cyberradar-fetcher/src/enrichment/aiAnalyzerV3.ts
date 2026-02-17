// © 2025 CyberLage
/**
 * AI Analyzer V3 — GPT-4o Prompts & Response Parsing
 *
 * V3 changes from V2:
 * - NO severity classification (now deterministic from CVSS)
 * - NO AI risk scoring (now deterministic from scoring.ts)
 * - AI ONLY does: summary, translation, compliance mapping, action items
 * - Richer user prompt with CSAF description + recommendations
 * - Improved DORA mapping (less conservative)
 * - Specific action items (must include product names/CVEs)
 *
 * This is SMALLER and CHEAPER per call than V2.
 */

import { AzureOpenAI } from 'openai';
import { CyberRadarAlert } from '../types/schema';
import { AIEnrichmentV3Result, AIEnrichmentV2ComplianceTag } from '../types/enrichment';

// Read from Function App settings
const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
const MODEL = process.env.AZURE_OPENAI_MODEL!;

let _client: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (!_client) {
    _client = new AzureOpenAI({
      endpoint: ENDPOINT,
      apiKey: API_KEY,
      apiVersion: API_VERSION,
    });
  }
  return _client;
}

// ══════════════════════════════════════════════════════════
// V3 SYSTEM PROMPT — summaries + compliance ONLY
// ══════════════════════════════════════════════════════════

const V3_ENRICHMENT_SYSTEM_PROMPT = `Du bist CyberRadar, ein Senior Cybersecurity Intelligence Analyst für den deutschen Markt.

Analysiere den Alert und liefere ein JSON-Ergebnis. Fokus: Zusammenfassung, Compliance-Bewertung, und SPEZIFISCHE Handlungsempfehlungen.

## ZUSAMMENFASSUNG

- summary: 2-3 Sätze Englisch. Was ist die Bedrohung? Wer ist betroffen? Was sollte getan werden?
- summaryDe: 2-3 Sätze Deutsch. Professionell, präzise, geeignet für ein CISO-Briefing.
- titleDe: Deutsche Übersetzung des Titels. Bei deutschen Titeln unverändert lassen.

## COMPLIANCE-BEWERTUNG

### NIS2 (BSIG)

Wähle die SPEZIFISCHSTE Referenz. NICHT immer §30 Abs.1 Nr.5 verwenden!
Zuordnungsregeln:
- Ransomware, Verfügbarkeitsausfall → §30 Nr.2 (Incident Handling) + §30 Nr.3 (BC/DR) + §32 (Meldepflicht)
- Phishing, Social Engineering → §30 Nr.7 (Cyberhygiene & Schulung)
- Supply-Chain-Angriff → §30 Nr.4 (Lieferkettensicherheit)
- Kryptografie/Auth-Bypass → §30 Nr.8 (Kryptografie) oder §30 Nr.10 (MFA)
- Zugangskontrolle, Asset-Vuln → §30 Nr.9 (Zugriffskontrolle)
- Schwachstellenmanagement, Patching → §30 Nr.5 (Schwachstellenbehandlung)
- Risikoanalyse-relevant → §30 Nr.1 (Risikoanalyse)
- Effektivitätsprüfung → §30 Nr.6 (Wirksamkeitsbewertung)
- Aktive Ausnutzung oder Vorfall → IMMER auch §32 (Meldepflicht) hinzufügen
- Management-Verantwortung → §38 (Haftung der Geschäftsleitung)

Ergebnis-Kategorien:
- "yes" = Direkt relevant für NIS2-Betreiber (aktiver Exploit, Breach, kritische Infrastruktur-Vuln)
- "conditional" = Relevant WENN die Organisation das betroffene Produkt nutzt
- "no" = Kein NIS2-Bezug

### DORA (Verordnung 2022/2554)

NEUE Zuordnungsregeln (weniger konservativ als V2):
- "yes" = EINES der folgenden trifft zu:
  * Ransomware/Breach bei Finanzdienstleister oder Zahlungsanbieter
  * Schwachstelle in Finanzsoftware (SAP Finance, SWIFT, Payment Gateways, Trading)
  * Cloud/Infrastruktur-Schwachstelle mit CVSS >= 9.0 (Finanzunternehmen nutzen diese sicher)
  * Angriff auf Verfügbarkeit von Diensten, die der Finanzsektor nutzt
  * Vorfall bei ICT-Drittanbieter (Cloud Provider, SaaS), der Finanzsektor bedient
- "conditional" = Enterprise-Technologie (OS, Email, DB, Netzwerk) mit CVSS < 9.0
- "no" = Nischenprodukt ohne Finanzbezug

Referenzen spezifisch zuordnen:
- IKT-Risikomanagement → Art. 5-6
- Schutzmaßnahmen → Art. 9-10
- Erkennung → Art. 11
- Incident Response → Art. 17-23 (Art. 19 Klassifizierung, Art. 20 Meldung)
- Drittanbieter-Risiko → Art. 28-30
- Informationsaustausch → Art. 45

### DSGVO

Zuordnungsregeln:
- "yes" = Bestätigter/wahrscheinlicher Personendatenverlust ODER Ransomware-Angriff (Angreifer exfiltrieren fast immer Daten vor Verschlüsselung!)
- "conditional" = Schwachstelle KÖNNTE zu Personendaten-Exposition führen
- null = Kein Personendatenbezug (reine Infrastruktur-Schwachstelle)

## HANDLUNGSEMPFEHLUNGEN (actionItemsDe)

KRITISCH: Handlungsempfehlungen müssen SPEZIFISCH für diesen Alert sein!

VERBOTEN (zu generisch):
- "Überwachung auf ungewöhnliche Aktivitäten"
- "Überprüfung der betroffenen Systeme"
- "Implementierung von Sicherheits-Patches"

RICHTIG (spezifisch):
- "Update [Produktname] auf Version [X.Y.Z] oder höher"
- "Prüfen ob [spezifischer Dienst/Port] exponiert ist und Zugriff einschränken"
- "Monitoring für [spezifisches IOC/Anzeichen] in Logdaten implementieren"
- "Wenn kein Patch verfügbar: [spezifische Mitigation, z.B. Konfigurationsänderung]"
- "[Spezifisches Feature] deaktivieren bis Patch verfügbar"

Mindestens 2, maximal 4 Empfehlungen. Jede muss den Produktnamen oder die CVE-ID enthalten.

## AUSGABEFORMAT (striktes JSON)

{
  "summary": "<2-3 Sätze Englisch>",
  "summaryDe": "<2-3 Sätze Deutsch>",
  "titleDe": "<Deutscher Titel>",
  "compliance": {
    "nis2": {
      "relevant": "yes|conditional|no",
      "confidence": "high|medium",
      "references": ["§30 Abs. 1 Nr. 2 BSIG", "§32 BSIG"],
      "reasoning": "<1-2 Sätze Deutsch>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 24|72|null,
      "actionItemsDe": ["<spezifische Empfehlung 1>", "<spezifische Empfehlung 2>"]
    },
    "dora": {
      "relevant": "yes|conditional|no",
      "confidence": "high|medium",
      "references": ["Art. 9 DORA"],
      "reasoning": "<1-2 Sätze Deutsch>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 4|72|null,
      "actionItemsDe": ["<spezifische Empfehlung>"]
    },
    "gdpr": {
      "relevant": "yes|conditional",
      "confidence": "high|medium",
      "references": ["Art. 32 DSGVO"],
      "reasoning": "<1-2 Sätze Deutsch>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 72|null,
      "actionItemsDe": ["<spezifische Empfehlung>"]
    }
  }
}

Wenn ein Compliance-Framework nicht relevant ist → null setzen (kein leeres Objekt).
NUR JSON ausgeben. Kein Markdown, keine Erklärung.`;

// ══════════════════════════════════════════════════════════
// V3 USER PROMPT — includes CSAF data + article text
// ══════════════════════════════════════════════════════════

function buildV3UserPrompt(alert: CyberRadarAlert & {
  csafDescription?: string | null;
  csafRecommendations?: string | null;
  articleText?: string | null;
}): string {
  let context = `TITEL: ${alert.title}
BESCHREIBUNG: ${alert.description || 'Nicht verfügbar'}`;

  // Add CSAF data if available (BSI alerts — this is the big improvement)
  if (alert.csafDescription) {
    context += `\n\nDETAILLIERTE BESCHREIBUNG (CSAF):\n${alert.csafDescription.slice(0, 2000)}`;
  }
  if (alert.csafRecommendations) {
    context += `\n\nHERSTELLER-EMPFEHLUNG:\n${alert.csafRecommendations.slice(0, 500)}`;
  }

  // Add article text if available (news sources)
  if (alert.articleText) {
    context += `\n\nARTIKELTEXT:\n${alert.articleText.slice(0, 2000)}`;
  }

  const epssDisplay =
    alert.epssScore != null ? `${(alert.epssScore * 100).toFixed(1)}% Ausnutzungswahrscheinlichkeit` : 'Nicht verfügbar';

  context += `\n
QUELLE: ${alert.sourceName} (Trust Tier: ${alert.sourceTrustTier ?? '?'})
VERÖFFENTLICHT: ${alert.publishedAt}
CVE-IDs: ${(alert.cveIds || []).slice(0, 10).join(', ') || 'Keine'}
CVSS: ${alert.cvssScore ?? 'Nicht verfügbar'}
EPSS: ${epssDisplay}
AKTIV AUSGENUTZT: ${alert.isActivelyExploited ? 'JA' : 'Nein'}
ZERO-DAY: ${alert.isZeroDay ? 'JA' : 'Nein'}
BETROFFENE PRODUKTE: ${(alert.affectedProducts || []).join(', ') || 'Unbekannt'}
BETROFFENE VERSIONEN: ${Array.isArray(alert.affectedVersions) ? alert.affectedVersions.slice(0, 10).join(', ') : (alert.affectedVersions || 'Unbekannt')}
ALERT-TYP: ${alert.alertType || 'unbekannt'}
SCHWEREGRAD: ${alert.severity || 'unbekannt'}
AI-SCORE: ${alert.aiScore}/100`;

  return context;
}

// ══════════════════════════════════════════════════════════
// RESPONSE PARSING & VALIDATION
// ══════════════════════════════════════════════════════════

function sanitizeComplianceTag(tag: any): AIEnrichmentV2ComplianceTag | null {
  if (!tag || typeof tag !== 'object') return null;

  const relevant = typeof tag.relevant === 'string' ? tag.relevant : 'conditional';
  const confidence = typeof tag.confidence === 'string' ? tag.confidence : 'low';

  const references = Array.isArray(tag.references) ? tag.references.filter((r: any) => typeof r === 'string') : [];
  const actionItemsDe = Array.isArray(tag.actionItemsDe) ? tag.actionItemsDe.filter((a: any) => typeof a === 'string') : [];

  return {
    relevant: (['yes', 'conditional', 'no'] as const).includes(relevant as any) ? (relevant as any) : 'conditional',
    confidence: (['high', 'medium', 'low'] as const).includes(confidence as any) ? (confidence as any) : 'low',
    references,
    reasoning: typeof tag.reasoning === 'string' ? tag.reasoning : '',
    reportingRequired: !!tag.reportingRequired,
    reportingDeadlineHours: typeof tag.reportingDeadlineHours === 'number' ? tag.reportingDeadlineHours : null,
    actionItemsDe,
  };
}

function validateV3Result(result: AIEnrichmentV3Result, original: CyberRadarAlert): AIEnrichmentV3Result {
  // Summaries
  if (!result.summary || typeof result.summary !== 'string') result.summary = original.title;
  if (!result.summaryDe || typeof result.summaryDe !== 'string') result.summaryDe = result.summary;

  // Title translation
  if (!result.titleDe || typeof result.titleDe !== 'string') {
    result.titleDe = original.title;
  }

  // Compliance structure
  if (!result.compliance || typeof result.compliance !== 'object') {
    result.compliance = { nis2: null, dora: null, gdpr: null };
  } else {
    result.compliance = {
      nis2: sanitizeComplianceTag((result.compliance as any).nis2),
      dora: sanitizeComplianceTag((result.compliance as any).dora),
      gdpr: sanitizeComplianceTag((result.compliance as any).gdpr),
    };
  }

  return result;
}

// ══════════════════════════════════════════════════════════
// MAIN ANALYZE FUNCTION
// ══════════════════════════════════════════════════════════

export async function analyzeAlertV3(
  alert: CyberRadarAlert & {
    csafDescription?: string | null;
    csafRecommendations?: string | null;
    articleText?: string | null;
  }
): Promise<AIEnrichmentV3Result & { tokensUsed: number }> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: V3_ENRICHMENT_SYSTEM_PROMPT },
      { role: 'user', content: buildV3UserPrompt(alert) },
    ],
    temperature: 0.2,
    max_tokens: 2000, // Smaller than V2 (2500) because no scoring/severity
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Empty AI response for alert ${alert.id}`);

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const parsed: AIEnrichmentV3Result = JSON.parse(cleaned);
  const validated = validateV3Result(parsed, alert);

  const tokensUsed =
    (response.usage?.prompt_tokens || 0) +
    (response.usage?.completion_tokens || 0);

  return { ...validated, tokensUsed };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function analyzeWithRetryV3(
  alert: CyberRadarAlert & {
    csafDescription?: string | null;
    csafRecommendations?: string | null;
    articleText?: string | null;
  },
  maxRetries: number = 2
): Promise<(AIEnrichmentV3Result & { tokensUsed: number }) | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await analyzeAlertV3(alert);
      return result;
    } catch (error: any) {
      // Rate limit - wait and retry
      if (error?.status === 429) {
        const retryAfter = parseInt(error?.headers?.['retry-after'] || '10');
        console.warn(`Rate limited, waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      // JSON parse error - retry
      if (error instanceof SyntaxError && attempt < maxRetries) {
        console.warn(`JSON parse failed for ${alert.id}, retry ${attempt + 1}`);
        await sleep(1000);
        continue;
      }

      // Content filter - skip this alert
      if (error?.code === 'content_filter') {
        console.error(`Content filter blocked alert ${alert.id}`);
        return null;
      }

      // Other error - log and skip on last attempt
      console.error(`AI V3 analysis failed for ${alert.id} (attempt ${attempt + 1}):`, error?.message || error);
      if (attempt === maxRetries) return null;
      await sleep(2000);
    }
  }
  return null;
}


