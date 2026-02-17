// © 2025 CyberLage
import { NextResponse } from "next/server";

// Tenant-specific logic disabled in public version
export async function GET() {
  return NextResponse.json(
    { error: "Tenant consent is not available in the public version." },
    { status: 501 }
  );
}



