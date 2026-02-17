// © 2025 CyberLage
import { NextResponse } from "next/server";
import { countUsers } from "@/lib/auth-store";

export async function GET() {
  try {
    const userCount = await countUsers();
    
    return NextResponse.json({
      hasUsers: userCount > 0,
      requiresSetup: userCount === 0,
    });
  } catch (error) {
    console.error("Setup-Prüfung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Setup-Status konnte nicht geprüft werden" },
      { status: 500 }
    );
  }
}


