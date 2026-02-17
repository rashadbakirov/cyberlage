// © 2025 CyberLage
// API: KI-Chat
import { NextRequest, NextResponse } from "next/server";
import { semanticSearch, type SearchAlertDocument, isSearchConfigured } from "@/lib/search";
import { chatWithContext, isOpenAIConfigured } from "@/lib/openai";
import { queryAlerts } from "@/lib/cosmos";

function textIncludes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

async function fallbackSearchFromCosmos(query: string): Promise<SearchAlertDocument[]> {
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { alerts } = await queryAlerts({
    page: 1,
    pageSize: 500,
    from,
    sortBy: "score",
    sortDir: "DESC",
  });

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map(term => term.trim())
    .filter(term => term.length > 2)
    .slice(0, 8);

  const scored = alerts
    .map(alert => {
      const text = [
        alert.title,
        alert.titleDe || "",
        alert.summary || "",
        alert.summaryDe || "",
        alert.description || "",
        alert.alertType || "",
        alert.sourceName || "",
        ...(alert.cveIds || []),
        ...(alert.affectedProducts || []),
        ...(alert.affectedVendors || []),
      ].join(" ");
      const hits = terms.reduce((sum, term) => (textIncludes(text, term) ? sum + 1 : sum), 0);
      return { alert, hits };
    })
    .filter(entry => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits || (b.alert.aiScore || 0) - (a.alert.aiScore || 0))
    .slice(0, 8)
    .map(entry => entry.alert as SearchAlertDocument);

  return scored;
}

function buildDeterministicReply(message: string, alerts: SearchAlertDocument[]): string {
  const top = alerts
    .slice(0, 5)
    .map((a, index) => {
      const title = a.titleDe || a.title || "Unbenannte Meldung";
      const severity = String(a.severity || "unbekannt").toUpperCase();
      const score = typeof a.aiScore === "number" ? a.aiScore : "k. A.";
      const exploited = a.isActivelyExploited ? " | aktiv ausgenutzt" : "";
      return `${index + 1}. ${title} (Score ${score}, ${severity}${exploited})`;
    })
    .join("\n");

  return [
    `Hinweis: KI-Antwort läuft aktuell im Fallback-Modus (OpenAI lokal nicht konfiguriert).`,
    ``,
    `Frage: ${message.trim()}`,
    ``,
    `Relevante Meldungen aus Ihren Daten:`,
    top || "- Keine passenden Meldungen gefunden.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;
    const conversationHistory = body?.conversationHistory || body?.history || [];

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Nachricht erforderlich" },
        { status: 400 }
      );
    }

    // Schritt 1: Relevante Meldungen suchen (RAG Retrieval)
    let relevantAlerts: SearchAlertDocument[] = [];
    if (isSearchConfigured()) {
      relevantAlerts = await semanticSearch(message.trim(), { top: 8 });
    } else {
      relevantAlerts = await fallbackSearchFromCosmos(message.trim());
    }

    if (relevantAlerts.length === 0) {
      return NextResponse.json({
        reply:
          "Diese Information liegt nicht in meinen aktuellen Meldungsdaten vor. Ich kann nur Fragen zu den erfassten Sicherheitsmeldungen beantworten.",
        citations: [],
        answer:
          "Diese Information liegt nicht in meinen aktuellen Meldungsdaten vor. Ich kann nur Fragen zu den erfassten Sicherheitsmeldungen beantworten.",
        sources: [],
      });
    }

    // Schritt 2: Antwort mit Kontext erzeugen
    let answer: string;
    if (isOpenAIConfigured()) {
      try {
        answer = await chatWithContext(
          message.trim(),
          relevantAlerts,
          Array.isArray(conversationHistory) ? conversationHistory : []
        );
      } catch (aiError) {
        console.warn("Chat-OpenAI-Fallback:", aiError);
        answer = buildDeterministicReply(message, relevantAlerts);
      }
    } else {
      answer = buildDeterministicReply(message, relevantAlerts);
    }

    // Schritt 3: Antwort mit Quellen zurückgeben
    const sources = relevantAlerts.map((a: SearchAlertDocument) => ({
      id: a.id,
      title: a.titleDe || a.title,
      severity: a.severity,
      source: a.sourceName || a.sourceId || "UNBEKANNT",
      url: a.sourceUrl,
    }));

    return NextResponse.json({
      reply: answer,
      citations: sources.map((s) => ({ alertId: s.id, title: s.title })),
      answer, // backwards compatible
      sources, // backwards compatible
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Chat-API-Fehler:", message);
    return NextResponse.json(
      { error: "Chat-Antwort konnte nicht generiert werden" },
      { status: 500 }
    );
  }
}


