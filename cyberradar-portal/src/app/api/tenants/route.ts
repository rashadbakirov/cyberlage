// © 2025 CyberLage
import { NextResponse } from "next/server";

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
function notAvailable() {
  return NextResponse.json(
    { error: "Tenant-Funktionen sind in der Public-Version nicht verfügbar." },
    { status: 501 }
  );
}

export async function GET() { return notAvailable(); }
export async function POST() { return notAvailable(); }
export async function PUT() { return notAvailable(); }
export async function PATCH() { return notAvailable(); }
export async function DELETE() { return notAvailable(); }


