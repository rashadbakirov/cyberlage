// © 2025 CyberLage
// OpenAI-Integration
import { AzureOpenAI } from "openai";
import type { Alert } from "@/types/alert";

let openaiClient: AzureOpenAI | null = null;

function resolveOpenAIEndpoint(): string | null {
  const endpoint = (process.env.AZURE_OPENAI_ENDPOINT || "").trim();
  return endpoint || null;
}

function resolveOpenAIKey(): string | null {
  const key = (process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || "").trim();
  return key || null;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(resolveOpenAIEndpoint() && resolveOpenAIKey());
}

export function getOpenAIClient(): AzureOpenAI {
  const endpoint = resolveOpenAIEndpoint();
  const apiKey = resolveOpenAIKey();
  if (!endpoint || !apiKey) {
    throw new Error(
      "Azure OpenAI is not configured. Expected AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY (or AZURE_OPENAI_KEY)."
    );
  }

  if (!openaiClient) {
    openaiClient = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-10-21",
    });
  }
  return openaiClient;
}

const MODEL = () => process.env.AZURE_OPENAI_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";

// Generate executive briefing from recent alerts
export async function generateBriefing(
  alerts: Alert[]
): Promise<string> {
  const client = getOpenAIClient();

  const alertSummaries = alerts
    .slice(0, 20)
    .map(
      (a, i: number) =>
        `${i + 1}. [${a.severity}] ${a.titleDe || a.title} (Score: ${a.aiScore || "N/A"})${a.isActivelyExploited ? " AKTIV AUSGENUTZT" : ""}${a.cveIds?.length ? ` | ${a.cveIds.join(", ")}` : ""}`
    )
    .join("\n");

  const response = await client.chat.completions.create({
    model: MODEL(),
    max_tokens: 2000,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `Du bist CyberLage, ein KI-Cybersecurity-Analyst fuer den deutschen Markt.
Erstelle ein taegliches Executive Briefing auf Deutsch.

FORMAT:
## Kritische Bedrohungen
[Top 3-5 critical/high items - 1-2 Saetze pro Bedrohung, warum sie wichtig ist]

## Lagebild
[3-4 Saetze: Gesamtueberblick, Trends, welche Branchen betroffen sind]

## Handlungsempfehlungen
[3-5 konkrete Massnahmen, sortiert nach Dringlichkeit]

## Statistik
[Kurze Zahlen: wie viele Alerts, wie viele kritisch, Quellen]

REGELN:
- Schreibe auf Deutsch, professionell aber verstaendlich
- Keine technischen Details, die ein CISO nicht braucht
- Fokus auf "Was bedeutet das?" und "Was tun?"
- Erwaehne CVE-Nummern nur bei den wichtigsten Schwachstellen
- Maximal 500 Woerter gesamt`,
      },
      {
        role: "user",
        content: `Erstelle das taegliche Briefing basierend auf diesen ${alerts.length} aktuellen Alerts:\n\n${alertSummaries}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "Briefing konnte nicht erstellt werden.";
}

// AI Chat: Answer question using RAG context
export async function chatWithContext(
  userMessage: string,
  contextAlerts: Array<Pick<Alert, "id" | "title"> & Partial<Alert>>,
  chatHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<string> {
  const client = getOpenAIClient();

  const context = contextAlerts
    .map(
      (a, i: number) =>
        `--- Alert ${i + 1} ---
Titel: ${a.titleDe || a.title}
Severity: ${a.severity} | Score: ${a.aiScore || "N/A"}
Zusammenfassung: ${a.summaryDe || a.summary || a.description || ""}
CVEs: ${a.cveIds?.join(", ") || "Keine"}
Quelle: ${a.sourceName || a.sourceId || "UNKNOWN"}
Datum: ${a.publishedAt || a.fetchedAt || ""}
Aktiv ausgenutzt: ${a.isActivelyExploited ? "JA" : "Nein"}
Link: ${a.sourceUrl || ""}`
    )
    .join("\n\n");

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    {
      role: "system",
      content: `Du bist der CyberLage KI-Analyst, ein spezialisierter Cybersecurity-Assistent fuer den deutschen Markt.

HEUTIGES DATUM: ${today}
Nutze dieses Datum als Referenz um zu bestimmen wie alt Meldungen sind (z.B. "vor 3 Tagen", "heute", "letzte Woche").

WICHTIGE REGELN:
1. Du antwortest AUSSCHLIESSLICH auf Basis der bereitgestellten CyberLage-Meldungen (siehe DATEN).
2. Wenn eine Frage NICHT aus den Meldungsdaten beantwortet werden kann, antworte exakt:
   "Diese Information liegt nicht in meinen aktuellen Meldungsdaten vor. Ich kann nur Fragen zu den erfassten Sicherheitsmeldungen beantworten."
3. Du gibst KEINE allgemeinen Cybersecurity-Ratschlaege, die nicht aus den konkreten Meldungen abgeleitet sind.
4. Antworte immer auf Deutsch, ausser der Nutzer fragt auf Englisch.
5. Verweise wenn moeglich auf konkrete Meldungen mit Titel, Score und Severity.
6. Bei Compliance-Fragen: zitiere die konkreten Referenzen (z.B. §/Art.) aus den Meldungsdaten.
7. NIEMALS erfinde Meldungen, Zahlen, CVEs oder Quellen.
8. Schreibe kurz und praezise (CISO-gerecht). Bei Listen: nummeriert.
9. Schreibe KEINE separate Quellen-Sektion im Text (Zitate werden separat angezeigt).

DATEN (nur diese verwenden):
${context}`,
    },
    ...chatHistory.slice(-6),
    {
      role: "user",
      content: userMessage,
    },
  ];

  const response = await client.chat.completions.create({
    model: MODEL(),
    max_tokens: 800,
    temperature: 0.3,
    messages,
  });

  return response.choices[0]?.message?.content || "Entschuldigung, ich konnte keine Antwort generieren.";
}


