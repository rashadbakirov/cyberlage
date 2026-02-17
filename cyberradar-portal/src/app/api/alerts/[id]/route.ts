// © 2025 CyberLage
// API: Alert-Detail
import { NextRequest, NextResponse } from "next/server";
import { getAlertById } from "@/lib/cosmos";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alert = await getAlertById(id);

    if (!alert) {
      return NextResponse.json(
        { error: "Alert nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(alert);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Alert-Detail-API-Fehler:", message);
    return NextResponse.json(
      { error: "Alert konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

