// © 2025 CyberLage
// API: alert detail
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
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(alert);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Alert detail API error:", message);
    return NextResponse.json(
      { error: "Alert could not be loaded" },
      { status: 500 }
    );
  }
}


