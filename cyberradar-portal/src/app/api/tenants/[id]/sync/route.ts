// © 2025 CyberLage
import { NextResponse } from "next/server";

// Tenant-specific logic disabled in public version
function notAvailable() {
  return NextResponse.json(
    { error: "Tenant features are not available in the public version." },
    { status: 501 }
  );
}

export async function GET() { return notAvailable(); }
export async function POST() { return notAvailable(); }
export async function PUT() { return notAvailable(); }
export async function PATCH() { return notAvailable(); }
export async function DELETE() { return notAvailable(); }


