// © 2025 CyberLage
import { NextResponse } from "next/server";

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export async function GET() {
  return NextResponse.json(
    { error: "Mandanten-Consent ist in der Public-Version nicht verfügbar." },
    { status: 501 }
  );
}


