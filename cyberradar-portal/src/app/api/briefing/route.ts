// © 2025 CyberLage
// API: Briefing
import { NextRequest, NextResponse } from "next/server";
import type { SqlParameter } from "@azure/cosmos";
import { getAlertsContainer } from "@/lib/cosmos";
import { generateBriefing } from "@/lib/openai";
import { resolveTimeRange } from "@/lib/window";
import type { Alert } from "@/types/alert";

export async function GET(request: NextRequest) {
  try {
    const container = getAlertsContainer();
    const { searchParams } = new URL(request.url);

    const range = resolveTimeRange({
      window: searchParams.get("window"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      defaultWindow: "24h",
    });

    // Kritischste aktuelle Meldungen für das Briefing laden
    const conditions: string[] = ["c.isProcessed = true"];
    const params: SqlParameter[] = [];
    if (range.from) {
      conditions.push("c.fetchedAt >= @from");
      params.push({ name: "@from", value: range.from });
    }
    if (range.to) {
      conditions.push("c.fetchedAt < @to");
      params.push({ name: "@to", value: range.to });
    }

    const query = `
      SELECT * FROM c
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.aiScore DESC
      OFFSET 0 LIMIT 20
    `;

    const { resources: alerts } = await container.items
      .query<Alert>({ query, parameters: params })
      .fetchAll();

    if (alerts.length === 0) {
      return NextResponse.json({
        briefing: "Keine Meldungen verfügbar für das Briefing.",
        generatedAt: new Date().toISOString(),
        alertCount: 0,
        window: range.window,
        from: range.from,
        to: range.to,
      });
    }

    const briefing = await generateBriefing(alerts);

    return NextResponse.json({
      briefing,
      generatedAt: new Date().toISOString(),
      alertCount: alerts.length,
      window: range.window,
      from: range.from,
      to: range.to,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Briefing-API-Fehler:", message);
    return NextResponse.json(
      { error: "Briefing konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}


