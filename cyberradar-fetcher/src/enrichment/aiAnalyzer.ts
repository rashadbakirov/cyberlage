// © 2025 CyberLage
/**
 * AI Analyzer — GPT-4o Prompts & Response Parsing
 * Processes one alert per call for reliability.
 */

import { AzureOpenAI } from 'openai';
import { CyberRadarAlert } from '../types/schema';
import { AIEnrichmentV2ComplianceTag, AIEnrichmentV2Result } from '../types/enrichment';

// Read from Function App settings — DO NOT hardcode
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

const ENRICHMENT_SYSTEM_PROMPT = `You are CyberRadar, a senior cybersecurity intelligence analyst for the German market.

Analyze the alert below and return a JSON response. Follow EVERY rule precisely.

## SEVERITY CLASSIFICATION (MANDATORY — never leave null)

Assign exactly one: "critical", "high", "medium", "low", "info"

Decision tree:
1. Is it actively exploited in the wild? → Start at "critical"
2. Is CVSS >= 9.0? → "critical"
3. Is CVSS 7.0-8.9? → "high"
4. Is CVSS 4.0-6.9? → "medium"
5. Is CVSS < 4.0? → "low"
6. No CVSS available? Use context:
   - Ransomware, APT, active breach, zero-day → "critical" or "high"
   - Vulnerability in widely-deployed product (Microsoft, Linux, Apache, SAP) → at least "high"
   - Vulnerability with no known exploit, limited scope → "medium"
   - Informational, guidance, policy update → "low" or "info"

## AI RISK SCORE (0-100)

Do NOT use a formula. Score holistically based on these anchor points:

95-100: Active exploitation confirmed + critical severity + widespread impact (e.g., CISA KEV, mass ransomware campaign)
85-94: Critical CVSS (9.0+) OR active exploitation OR zero-day in major product
75-84: High CVSS (7.0-8.9) + widely-deployed product OR confirmed breach with significant data exposure
60-74: High CVSS in niche product, OR medium CVSS in widespread product, OR advisory with actionable patch
45-59: Medium CVSS, limited scope, patch available, no exploitation known
30-44: Low-severity vulnerability, informational advisory, or guidance document
0-29: Pure informational content, no direct threat

Important scoring adjustments:
- If isActivelyExploited = true → minimum score 85
- If isZeroDay = true → add +15 (cap at 100)
- If EPSS > 0.5 (50% exploitation probability) → minimum score 80
- If source is CISA KEV → minimum score 85
- If source is BSI CERT-Bund with CVSS ≥ 9.0 → minimum score 80
- Multiple CVEs in one advisory → score based on the WORST CVE, not average

Write a 1-sentence reasoning that references the specific factors.

## COMPLIANCE MAPPING

### NIS2 (German: NIS2UmsuCG / BSIG)

Reference table — use the SPECIFIC article that matches:
- §28 BSIG: Scope — who is "essential" vs "important" entity
- §29 BSIG: Risk management governance — management body must approve measures
- §30 BSIG: Risk management measures — technical/organizational security measures
  - §30 Abs. 1 Nr. 1: Risk analysis and IT system security policies
  - §30 Abs. 1 Nr. 2: Incident handling
  - §30 Abs. 1 Nr. 3: Business continuity and crisis management
  - §30 Abs. 1 Nr. 4: Supply chain security
  - §30 Abs. 1 Nr. 5: Security in network/system acquisition, development, maintenance, vulnerability handling
  - §30 Abs. 1 Nr. 6: Assessment of risk management effectiveness
  - §30 Abs. 1 Nr. 7: Cybersecurity hygiene and training
  - §30 Abs. 1 Nr. 8: Cryptography and encryption
  - §30 Abs. 1 Nr. 9: HR security, access control, asset management
  - §30 Abs. 1 Nr. 10: MFA, secured communication, emergency communication
- §31 BSIG: Special measures for operators of critical infrastructure
- §32 BSIG: Incident reporting obligations
  - Early warning: 24 hours
  - Incident notification: 72 hours
  - Final report: 1 month
- §33 BSIG: Registration obligations
- §34 BSIG: Implementation proof (audit/certification)
- §38 BSIG: Management liability — boards personally liable for non-compliance
- §65 BSIG: Fines — up to €10M or 2% worldwide turnover (essential), €7M or 1.4% (important)

Rules:
- "yes" = directly applicable to NIS2-covered entities (vulnerability in critical infra, breach, active exploit, incident)
- "conditional" = relevant IF the organization uses the affected product/service
- "no" = no clear NIS2 relevance (pure info, non-security topic)
- Reference the SPECIFIC subsection (e.g., "§30 Abs. 1 Nr. 5 BSIG" for vulnerability handling, not just "§30 BSIG")
- If incident reporting may be required (breach, active exploit, critical failure): set reportingRequired=true and cite §32

### DORA (EU Regulation 2022/2554)

Reference table:
- Art. 5-6: ICT risk management framework and governance
- Art. 7: ICT systems, protocols, and tools
- Art. 8: Identification of ICT risks (asset management, dependencies)
- Art. 9-10: Protection and prevention measures
- Art. 11: Detection of anomalous activities
- Art. 12-14: Response and recovery
- Art. 17-23: ICT-related incident management and reporting
  - Art. 19: Classification of incidents
  - Art. 20: Reporting of major incidents (initial within 4 hours, intermediate 72h, final 1 month)
- Art. 28-30: ICT third-party risk management
- Art. 45: Cyber threat intelligence sharing arrangements

Rules:
- "yes" = DIRECTLY affects financial sector entities: ransomware on payment/banking system, breach at financial institution, vulnerability in financial software (SWIFT, payment processors, trading platforms, banking APIs, insurance systems), or any incident affecting availability of financial services
- "conditional" = affects technology that financial entities commonly use (cloud, email, OS, network equipment) but is not specific to finance
- "no" = no financial sector relevance
- If ransomware, data breach, or service outage affects financial infrastructure → ALWAYS "yes"

### GDPR (DSGVO)

Triggers — if ANY of these are present, GDPR is relevant:
- Personal data breach (names, emails, credentials leaked)
- Credential theft, credential stuffing attacks
- PII exposure, data exfiltration
- Database breach containing user data
- Phishing campaign targeting personal data
- Tracking/surveillance vulnerability
- Any mention of "personal data", "user data", "customer data", "employee data"

Reference table:
- Art. 5 DSGVO: Data processing principles
- Art. 32 DSGVO: Security of processing (technical/organizational measures)
- Art. 33 DSGVO: Notification to supervisory authority (72 hours)
- Art. 34 DSGVO: Communication to data subjects
- Art. 83 DSGVO: Fines (up to €20M or 4% worldwide turnover)

Rules:
- "yes" = involves confirmed/likely personal data exposure or breach
- "conditional" = vulnerability COULD lead to personal data exposure if exploited
- null = no personal data relevance (pure infrastructure vulnerability without data exposure angle)

## SUMMARY AND TRANSLATION

- summary: 2-3 sentence English executive summary. Focus on: what is the threat, who is affected, what should be done.
- summaryDe: German translation of the summary. Professional, concise, suitable for a CISO briefing.
- titleDe: German translation of title. If title is already German, keep it unchanged.

## OUTPUT FORMAT (strict JSON)

{
  "severity": "critical|high|medium|low|info",
  "aiScore": <number 0-100>,
  "aiScoreReasoning": "<1 sentence>",
  "summary": "<2-3 sentences English>",
  "summaryDe": "<2-3 sentences German>",
  "titleDe": "<German title>",
  "compliance": {
    "nis2": {
      "relevant": "yes|conditional|no",
      "confidence": "high|medium|low",
      "references": ["§30 Abs. 1 Nr. 5 BSIG", "§32 BSIG"],
      "reasoning": "<1-2 sentences German>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 24|72|null,
      "actionItemsDe": ["<specific German action 1>", "<specific German action 2>", "<specific German action 3>"]
    },
    "dora": {
      "relevant": "yes|conditional|no",
      "confidence": "high|medium|low",
      "references": ["Art. 9 DORA"],
      "reasoning": "<1-2 sentences German>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 4|72|null,
      "actionItemsDe": ["<specific German action>"]
    },
    "gdpr": {
      "relevant": "yes|conditional",
      "confidence": "high|medium|low",
      "references": ["Art. 32 DSGVO"],
      "reasoning": "<1-2 sentences German>",
      "reportingRequired": true|false,
      "reportingDeadlineHours": 72|null,
      "actionItemsDe": ["<specific German action>"]
    }
  }
}

If a compliance regulation is not relevant at all, set it to null (not an empty object).

Return ONLY the JSON. No markdown, no explanation outside JSON.`;

function buildUserPrompt(alert: CyberRadarAlert): string {
  const epssDisplay =
    alert.epssScore != null ? `${(alert.epssScore * 100).toFixed(1)}%` : 'Not available';

  return `Analyze this cybersecurity alert:

TITLE: ${alert.title}
DESCRIPTION: ${alert.description || 'N/A'}
SOURCE: ${alert.sourceName} (Trust Tier: ${alert.sourceTrustTier ?? 'unknown'})
PUBLISHED: ${alert.publishedAt}
CVE IDs: ${(alert.cveIds || []).join(', ') || 'None'}
CVSS SCORE: ${alert.cvssScore ?? 'Not available'}
EPSS SCORE: ${epssDisplay}
ACTIVELY EXPLOITED: ${alert.isActivelyExploited ? 'YES' : 'No'}
ZERO-DAY: ${alert.isZeroDay ? 'YES' : 'No'}
AFFECTED VENDORS: ${(alert.affectedVendors || []).join(', ') || 'Unknown'}
AFFECTED PRODUCTS: ${(alert.affectedProducts || []).join(', ') || 'Unknown'}
ALERT TYPE: ${alert.alertType || 'unknown'}
SOURCE LANGUAGE: ${alert.sourceLanguage || 'en'}`;
}

function sanitizeComplianceTag(tag: any): AIEnrichmentV2ComplianceTag | null {
  if (!tag || typeof tag !== 'object') return null;

  const relevant = typeof tag.relevant === 'string' ? tag.relevant : 'conditional';
  const confidence = typeof tag.confidence === 'string' ? tag.confidence : 'low';

  const references = Array.isArray(tag.references) ? tag.references.filter((r: any) => typeof r === 'string') : [];
  const actionItemsDe = Array.isArray(tag.actionItemsDe) ? tag.actionItemsDe.filter((a: any) => typeof a === 'string') : [];

  return {
    relevant: ['yes', 'conditional', 'no'].includes(relevant) ? relevant : 'conditional',
    confidence: ['high', 'medium', 'low'].includes(confidence) ? confidence : 'low',
    references,
    reasoning: typeof tag.reasoning === 'string' ? tag.reasoning : '',
    reportingRequired: !!tag.reportingRequired,
    reportingDeadlineHours: typeof tag.reportingDeadlineHours === 'number' ? tag.reportingDeadlineHours : null,
    actionItemsDe,
  };
}

function validateAIResult(result: AIEnrichmentV2Result, original: CyberRadarAlert): AIEnrichmentV2Result {
  // Normalize severity
  const severity = typeof result.severity === 'string' ? result.severity.toLowerCase() : 'medium';
  result.severity = (['critical', 'high', 'medium', 'low', 'info'] as const).includes(severity as any)
    ? (severity as any)
    : (original.severity || 'medium');

  // Clamp aiScore
  result.aiScore = Math.max(0, Math.min(100, Math.round(typeof result.aiScore === 'number' ? result.aiScore : 50)));

  // Ensure reasoning
  if (!result.aiScoreReasoning || typeof result.aiScoreReasoning !== 'string') {
    result.aiScoreReasoning = `Score: ${result.aiScore}`;
  }

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

export async function analyzeAlert(alert: CyberRadarAlert): Promise<AIEnrichmentV2Result & { tokensUsed: number }> {
  const client = getClient();
  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(alert) },
    ],
    temperature: 0.2,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Empty AI response for alert ${alert.id}`);

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const parsed: AIEnrichmentV2Result = JSON.parse(cleaned);
  const validated = validateAIResult(parsed, alert);

  const tokensUsed =
    (response.usage?.prompt_tokens || 0) +
    (response.usage?.completion_tokens || 0);

  return { ...validated, tokensUsed };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function analyzeWithRetry(
  alert: CyberRadarAlert,
  maxRetries: number = 2
): Promise<(AIEnrichmentV2Result & { tokensUsed: number }) | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await analyzeAlert(alert);
      return result;
    } catch (error: any) {
      // Rate limit — wait and retry
      if (error?.status === 429) {
        const retryAfter = parseInt(error?.headers?.['retry-after'] || '10');
        console.warn(`Rate limited, waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      // JSON parse error — retry
      if (error instanceof SyntaxError && attempt < maxRetries) {
        console.warn(`JSON parse failed for ${alert.id}, retry ${attempt + 1}`);
        await sleep(1000);
        continue;
      }

      // Content filter — skip this alert
      if (error?.code === 'content_filter') {
        console.error(`Content filter blocked alert ${alert.id}`);
        return null;
      }

      // Other error — log and skip on last attempt
      console.error(`AI analysis failed for ${alert.id} (attempt ${attempt + 1}):`, error?.message || error);
      if (attempt === maxRetries) return null;
      await sleep(2000);
    }
  }
  return null;
}


