// © 2025 CyberLage
// OpenAI integration
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
        `${i + 1}. [${a.severity}] ${a.title || a.titleDe} (Score: ${a.aiScore || "N/A"})${a.isActivelyExploited ? " ACTIVELY EXPLOITED" : ""}${a.cveIds?.length ? ` | ${a.cveIds.join(", ")}` : ""}`
    )
    .join("\n");

  const response = await client.chat.completions.create({
    model: MODEL(),
    max_tokens: 2000,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are CyberLage, an AI cybersecurity analyst for enterprise security teams.
Create a daily executive briefing in English.

FORMAT:
## Critical threats
[Top 3-5 critical/high items - 1-2 sentences each and why it matters]

## Situational overview
[3-4 sentences: overall picture, trends, and affected sectors]

## Recommended actions
[3-5 concrete actions, sorted by urgency]

## Statistics
[Short metrics: alert count, critical count, source mix]

RULES:
- Write in English, professional and concise
- Avoid unnecessary technical detail
- Focus on "What does this mean?" and "What should we do?"
- Mention CVE IDs only for the most important vulnerabilities
- Maximum 500 words total`,
      },
      {
        role: "user",
        content: `Create the daily briefing based on these ${alerts.length} current alerts:\n\n${alertSummaries}`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "Briefing could not be generated.";
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
Title: ${a.title || a.titleDe}
Severity: ${a.severity} | Score: ${a.aiScore || "N/A"}
Summary: ${a.summary || a.summaryDe || a.description || ""}
CVEs: ${a.cveIds?.join(", ") || "None"}
Source: ${a.sourceName || a.sourceId || "UNKNOWN"}
Date: ${a.publishedAt || a.fetchedAt || ""}
Actively exploited: ${a.isActivelyExploited ? "YES" : "No"}
Link: ${a.sourceUrl || ""}`
    )
    .join("\n\n");

  const today = new Date().toLocaleDateString('en-US', {
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
      content: `You are the CyberLage AI Analyst, a specialized cybersecurity assistant.

TODAY'S DATE: ${today}
Use this date as reference to determine alert age (for example: "3 days ago", "today", "last week").

IMPORTANT RULES:
1. Respond ONLY based on the provided CyberLage alerts (see DATA).
2. If a question cannot be answered from alert data, respond exactly:
   "This information is not available in my current alert dataset. I can only answer questions based on captured security alerts."
3. Do NOT provide generic cybersecurity advice not grounded in the provided alerts.
4. Always respond in English.
5. Reference concrete alerts with title, score, and severity when possible.
6. For compliance questions, cite specific references (for example section/article) from alert data.
7. NEVER invent alerts, figures, CVEs, or sources.
8. Be concise and executive-friendly. Use numbered lists when listing items.
9. Do NOT include a separate sources section in the text (citations are shown separately).

DATA (use only this):
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

  return response.choices[0]?.message?.content || "Sorry, I could not generate a response.";
}




