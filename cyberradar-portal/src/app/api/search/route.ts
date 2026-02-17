// © 2025 CyberLage
// API: Suche
import { NextRequest, NextResponse } from "next/server";
import { searchAlerts } from "@/lib/search";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Suchbegriff erforderlich (Parameter: q)" },
        { status: 400 }
      );
    }

    const top = Math.min(parseInt(searchParams.get("top") || "20"), 50);
    const skip = parseInt(searchParams.get("skip") || "0");
    const severity = searchParams.get("severity");

    // OData-Filter erstellen, wenn Schweregrad gesetzt ist
    let filter: string | undefined;
    if (severity) {
      filter = `severity eq '${severity}'`;
    }

    const { results, total } = await searchAlerts(query.trim(), {
      top,
      skip,
      filter,
    });

    return NextResponse.json({
      query: query.trim(),
      results,
      total,
      top,
      skip,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Such-API-Fehler:", message);
    return NextResponse.json(
      { error: "Suche fehlgeschlagen" },
      { status: 500 }
    );
  }
}


