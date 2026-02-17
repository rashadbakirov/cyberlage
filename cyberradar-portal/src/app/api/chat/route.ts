// © 2025 CyberLage
// API: AI chat
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
      const title = a.titleDe || a.title || "Untitled alert";
      const severity = String(a.severity || "unknown").toUpperCase();
      const score = typeof a.aiScore === "number" ? a.aiScore : "N/A";
      const exploited = a.isActivelyExploited ? " | actively exploited" : "";
      return `${index + 1}. ${title} (Score ${score}, ${severity}${exploited})`;
    })
    .join("\n");

  return [
    `Note: AI response currently runs in fallback mode (OpenAI is not configured locally).`,
    ``,
    `Question: ${message.trim()}`,
    ``,
    `Relevant alerts from your data:`,
    top || "- No matching alerts found.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;
    const conversationHistory = body?.conversationHistory || body?.history || [];

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Step 1: retrieve relevant alerts (RAG retrieval)
    let relevantAlerts: SearchAlertDocument[] = [];
    if (isSearchConfigured()) {
      relevantAlerts = await semanticSearch(message.trim(), { top: 8 });
    } else {
      relevantAlerts = await fallbackSearchFromCosmos(message.trim());
    }

    if (relevantAlerts.length === 0) {
      return NextResponse.json({
        reply:
          "This information is not available in my current alert dataset. I can only answer questions based on captured security alerts.",
        citations: [],
        answer:
          "This information is not available in my current alert dataset. I can only answer questions based on captured security alerts.",
        sources: [],
      });
    }

    // Step 2: generate response with context
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

    // Step 3: return response with citations
    const sources = relevantAlerts.map((a: SearchAlertDocument) => ({
      id: a.id,
      title: a.titleDe || a.title,
      severity: a.severity,
      source: a.sourceName || a.sourceId || "UNKNOWN",
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
    console.error("Chat API error:", message);
    return NextResponse.json(
      { error: "Chat response could not be generated" },
      { status: 500 }
    );
  }
}



