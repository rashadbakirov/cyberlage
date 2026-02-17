// © 2025 CyberLage
// API: search
import { NextRequest, NextResponse } from "next/server";
import { searchAlerts } from "@/lib/search";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search term is required (parameter: q)" },
        { status: 400 }
      );
    }

    const top = Math.min(parseInt(searchParams.get("top") || "20"), 50);
    const skip = parseInt(searchParams.get("skip") || "0");
    const severity = searchParams.get("severity");

    // Build OData filter when severity is provided
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
    console.error("Search API error:", message);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}



