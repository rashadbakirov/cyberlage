// © 2025 CyberLage
/**
 * German Translation Service
 * Translates titles and AI-generated summaries to German using GPT-4o.
 * Batches up to 10 items per call.
 */

import { AzureOpenAI } from 'openai';

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

const TRANSLATION_SYSTEM_PROMPT = `You are a professional German translator for cybersecurity content.
Translate English cybersecurity titles and summaries into formal German (Sie-Form).

RULES:
1. Use formal German. Audience: enterprise IT security professionals and CISOs.
2. KEEP these terms in English (standard in German IT):
   Zero-Day, Patch, Update, Firewall, Exploit, Malware, Ransomware, Phishing,
   CVE, CVSS, Buffer Overflow, SQL Injection, XSS, RCE, PoC, DDoS, APT, IoC, C2
3. TRANSLATE these terms:
   vulnerability → Schwachstelle
   actively exploited → wird aktiv ausgenutzt
   authentication bypass → Authentifizierungsumgehung
   remote code execution → Remote-Code-Ausführung (or keep RCE)
   data breach → Datenschutzverletzung
   threat actor → Bedrohungsakteur
   supply chain attack → Lieferkettenangriff
   security advisory → Sicherheitshinweis
   patch management → Patch-Management
   privilege escalation → Rechteausweitung
   denial of service → Dienstblockade (or keep DDoS)
4. Keep ALL brand names, product names, and CVE IDs unchanged.
5. Keep the same urgency tone. Critical stays critical.
6. Output ONLY valid JSON. No other text.`;

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
 * Translate a batch of up to 10 alerts.
 * German-source items get title copied (already German) and only summary translated.
 */
export async function translateBatch(
  items: TranslationInput[]
): Promise<TranslationOutput[]> {
  if (items.length === 0) return [];

  const client = getClient();
  const results: TranslationOutput[] = [];

  // Separate German-source items (no title translation needed)
  const needsTitleTranslation = items.filter(i => i.sourceLanguage !== 'de');
  const alreadyGerman = items.filter(i => i.sourceLanguage === 'de');

  // Translate English items (title + summary)
  if (needsTitleTranslation.length > 0) {
    try {
      const prompt = `Translate these cybersecurity alerts to German.
For each item, provide titleDe and summaryDe.

${JSON.stringify(
  needsTitleTranslation.map(i => ({
    id: i.id,
    title: i.title,
    summary: i.summary,
  })),
  null,
  2
)}

Return a JSON object with key "translations" containing the array:
{ "translations": [{ "id": "...", "titleDe": "...", "summaryDe": "..." }] }`;

      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      // Handle both array format and { key: [...] } object wrapper format
      let translated: TranslationOutput[];
      if (Array.isArray(parsed)) {
        translated = parsed;
      } else {
        // Extract the first array value from the object (handles any key name)
        const keys = Object.keys(parsed);
        console.log(`Translation response keys: [${keys.join(', ')}]`);
        const arrayValue = Object.values(parsed).find(v => Array.isArray(v)) as TranslationOutput[] | undefined;
        translated = arrayValue || [];
      }
      console.log(`Translation parsed ${translated.length} items from response`);

      for (const t of translated) {
        if (t && t.id) {
          results.push({
            id: t.id,
            titleDe: t.titleDe || '',
            summaryDe: t.summaryDe || '',
          });
        }
      }
    } catch (error: any) {
      console.error('Translation batch (EN→DE) failed:', error?.message || error);
      // Fallback: use original titles as-is
      for (const item of needsTitleTranslation) {
        results.push({
          id: item.id,
          titleDe: item.title, // Keep English as fallback
          summaryDe: item.summary,
        });
      }
    }
  }

  // Handle German-source items
  if (alreadyGerman.length > 0) {
    // Title is already German, just translate the English summary
    try {
      const summaryPrompt = `Translate these English summaries to German:
${JSON.stringify(alreadyGerman.map(i => ({ id: i.id, summary: i.summary })))}
Return a JSON object with key "translations" containing the array:
{ "translations": [{ "id": "...", "summaryDe": "..." }] }`;

      const summaryResponse = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
          { role: 'user', content: summaryPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const summaryContent = summaryResponse.choices[0]?.message?.content || '{}';
      const summaryParsed = JSON.parse(
        summaryContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      );
      let summaryTranslated: { id: string; summaryDe: string }[];
      if (Array.isArray(summaryParsed)) {
        summaryTranslated = summaryParsed;
      } else {
        const arrayValue = Object.values(summaryParsed).find(v => Array.isArray(v)) as { id: string; summaryDe: string }[] | undefined;
        summaryTranslated = arrayValue || [];
      }

      for (const item of alreadyGerman) {
        const translated = summaryTranslated.find(s => s.id === item.id);
        results.push({
          id: item.id,
          titleDe: item.title, // Already German
          summaryDe: translated?.summaryDe || item.summary,
        });
      }
    } catch (error: any) {
      console.error('Translation batch (DE summaries) failed:', error?.message || error);
      for (const item of alreadyGerman) {
        results.push({
          id: item.id,
          titleDe: item.title,
          summaryDe: item.summary,
        });
      }
    }
  }

  return results;
}

/**
 * Validate translation quality.
 */
export function validateTranslation(
  original: { title: string; summary: string; cveIds: string[]; affectedVendors: string[] },
  translated: { titleDe: string; summaryDe: string }
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // 1. CVE IDs must be preserved in titleDe if they were in original title
  for (const cve of original.cveIds) {
    if (original.title.includes(cve) && !translated.titleDe.includes(cve)) {
      warnings.push(`CVE ${cve} missing from titleDe`);
    }
  }

  // 2. Brand names preserved
  for (const vendor of original.affectedVendors) {
    if (vendor.length > 3) {
      const inTitle = translated.titleDe.toLowerCase().includes(vendor.toLowerCase());
      const inSummary = translated.summaryDe?.toLowerCase().includes(vendor.toLowerCase());
      if (!inTitle && !inSummary) {
        warnings.push(`Vendor "${vendor}" missing from German translation`);
      }
    }
  }

  // 3. Length sanity check
  const titleRatio = translated.titleDe.length / Math.max(original.title.length, 1);
  if (titleRatio > 2.0) warnings.push(`titleDe is ${Math.round(titleRatio * 100)}% of original — possibly over-translated`);
  if (titleRatio < 0.3) warnings.push(`titleDe is only ${Math.round(titleRatio * 100)}% of original — possibly truncated`);

  return { valid: warnings.length === 0, warnings };
}


