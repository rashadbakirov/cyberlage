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

const V3_ENRICHMENT_SYSTEM_PROMPT = `You are CyberRadar, a senior cybersecurity intelligence analyst.

Analyze the alert and return one JSON result. Focus on summary, compliance mapping, and SPECIFIC recommended actions.

## SUMMARY

- summary: 2-3 English sentences. What is the threat, who is affected, and what should be done?
- summaryDe: Keep this as an English mirror of summary for backward compatibility.
- titleDe: Keep this as an English title mirror for backward compatibility.

## COMPLIANCE MAPPING

### NIS2 (BSIG)

Choose the MOST SPECIFIC reference. Do not always default to Section 30(1) No. 5.
Mapping guidance:
- Ransomware, availability outage -> Section 30 No. 2 (incident handling) + Section 30 No. 3 (BC/DR) + Section 32 (reporting)
- Phishing, social engineering -> Section 30 No. 7 (cyber hygiene and training)
- Supply chain attack -> Section 30 No. 4 (supply chain security)
- Cryptography/auth bypass -> Section 30 No. 8 (cryptography) or Section 30 No. 10 (MFA)
- Access control, asset vulnerability -> Section 30 No. 9 (access control)
- Vulnerability management, patching -> Section 30 No. 5 (vulnerability handling)
- Risk analysis relevance -> Section 30 No. 1 (risk analysis)
- Effectiveness verification -> Section 30 No. 6 (effectiveness assessment)
- Active exploitation or incident -> ALWAYS add Section 32 (reporting)
- Management responsibility -> Section 38 (management liability)

Result categories:
- "yes" = directly relevant for NIS2-regulated operators (active exploit, breach, critical infrastructure vulnerability)
- "conditional" = relevant if the organization uses the affected product
- "no" = no NIS2 relevance

### DORA (Regulation 2022/2554)

Mapping guidance:
- "yes" when at least one applies:
  * Ransomware/breach at a financial entity or payment provider
  * Vulnerability in finance software (for example SAP finance, SWIFT, payment gateways, trading)
  * Cloud/infrastructure vulnerability with CVSS >= 9.0 likely used by financial entities
  * Attack on service availability used by the financial sector
  * Incident at an ICT third-party provider serving financial entities
- "conditional" = enterprise technology (OS, email, database, network) with CVSS < 9.0
- "no" = niche product with no financial relevance

Reference mapping:
- ICT risk management -> Art. 5-6
- Protective measures -> Art. 9-10
- Detection -> Art. 11
- Incident response -> Art. 17-23 (Art. 19 classification, Art. 20 reporting)
- Third-party risk -> Art. 28-30
- Information sharing -> Art. 45

### GDPR

Mapping guidance:
- "yes" = confirmed/likely personal-data loss OR ransomware attack
- "conditional" = vulnerability could expose personal data
- null = no personal-data relevance (pure infrastructure vulnerability)

## RECOMMENDED ACTIONS (actionItemsDe)

CRITICAL: Recommendations must be SPECIFIC to this alert.

Too generic (forbidden):
- "Monitor unusual activity"
- "Review affected systems"
- "Apply security patches"

Good examples (specific):
- "Update [product] to version [X.Y.Z] or later"
- "Check whether [specific service/port] is exposed and restrict access"
- "Add monitoring for [specific IOC indicator] in logs"
- "If no patch exists: apply [specific mitigation such as config change]"
- "Disable [specific feature] until patch is available"

Provide at least 2 and at most 4 recommendations. Each should include product name or CVE ID when possible.

## OUTPUT FORMAT (strict JSON)

{
  "summary": "<2-3 English sentences>",
  "summaryDe": "<2-3 English sentences mirror>",
  "titleDe": "<English title mirror>",
  "compliance": {
    "nis2": {
      "relevant": "yes|conditional|no",
      "confidence": "high|medium",
      "references": ["§30 Abs. 1 Nr. 2 BSIG", "§32 BSIG"],
      "reasoning": "<1-2 English sentences>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 24|72|null,
      "actionItemsDe": ["<specific recommendation 1>", "<specific recommendation 2>"]
    },
    "dora": {
      "relevant": "yes|conditional|no",
      "confidence": "high|medium",
      "references": ["Art. 9 DORA"],
      "reasoning": "<1-2 English sentences>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 4|72|null,
      "actionItemsDe": ["<specific recommendation>"]
    },
    "gdpr": {
      "relevant": "yes|conditional",
      "confidence": "high|medium",
      "references": ["Art. 32 GDPR"],
      "reasoning": "<1-2 English sentences>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 72|null,
      "actionItemsDe": ["<specific recommendation>"]
    }
  }
}

If a compliance framework is not relevant, set it to null (not an empty object).
Return JSON only. No Markdown. No explanation.`;

// ══════════════════════════════════════════════════════════
// V3 USER PROMPT — includes CSAF data + article text
// ══════════════════════════════════════════════════════════

function buildV3UserPrompt(alert: CyberRadarAlert & {
  csafDescription?: string | null;
  csafRecommendations?: string | null;
  articleText?: string | null;
}): string {
  let context = `TITLE: ${alert.title}
DESCRIPTION: ${alert.description || 'Not available'}`;

  // Add CSAF data if available (BSI alerts — this is the big improvement)
  if (alert.csafDescription) {
    context += `\n\nDETAILED DESCRIPTION (CSAF):\n${alert.csafDescription.slice(0, 2000)}`;
  }
  if (alert.csafRecommendations) {
    context += `\n\nVENDOR RECOMMENDATION:\n${alert.csafRecommendations.slice(0, 500)}`;
  }

  // Add article text if available (news sources)
  if (alert.articleText) {
    context += `\n\nARTICLE TEXT:\n${alert.articleText.slice(0, 2000)}`;
  }

  const epssDisplay =
    alert.epssScore != null ? `${(alert.epssScore * 100).toFixed(1)}% exploitation likelihood` : 'Not available';

  context += `\n
SOURCE: ${alert.sourceName} (Trust Tier: ${alert.sourceTrustTier ?? '?'})
PUBLISHED: ${alert.publishedAt}
CVE IDs: ${(alert.cveIds || []).slice(0, 10).join(', ') || 'None'}
CVSS: ${alert.cvssScore ?? 'Not available'}
EPSS: ${epssDisplay}
ACTIVELY EXPLOITED: ${alert.isActivelyExploited ? 'YES' : 'No'}
ZERO-DAY: ${alert.isZeroDay ? 'YES' : 'No'}
AFFECTED PRODUCTS: ${(alert.affectedProducts || []).join(', ') || 'Unknown'}
AFFECTED VERSIONS: ${Array.isArray(alert.affectedVersions) ? alert.affectedVersions.slice(0, 10).join(', ') : (alert.affectedVersions || 'Unknown')}
ALERT TYPE: ${alert.alertType || 'unknown'}
SEVERITY: ${alert.severity || 'unknown'}
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



