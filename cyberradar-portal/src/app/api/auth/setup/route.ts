// © 2025 CyberLage
import { NextResponse } from "next/server";
import { createUser, countUsers } from "@/lib/auth-store";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";

export async function POST(req: Request) {
  try {
    // Sicherheit: In Produktion ein Setup-Token erzwingen
    const isProduction = process.env.NODE_ENV === "production";
    const setupToken = process.env.SETUP_TOKEN;
    
    if (isProduction && setupToken) {
      const authHeader = req.headers.get("x-setup-token");
      if (authHeader !== setupToken) {
        return NextResponse.json(
          { error: "Nicht autorisiert. Setup-Token fehlt oder ist ungültig." },
          { status: 401 }
        );
      }
    }
    
    // Setup nur erlauben, wenn noch keine Nutzer existieren
    const userCount = await countUsers();
    if (userCount > 0) {
      return NextResponse.json(
        { error: "Setup bereits abgeschlossen. Nutzer existieren bereits." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Pflichtfelder fehlen" },
        { status: 400 }
      );
    }

    // Passwort-Policy prüfen
    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.ok) {
      return NextResponse.json(
        { error: policyCheck.errors.join(", ") },
        { status: 400 }
      );
    }

    // Passwort hashen
    const passwordHash = await hashPassword(password);

    // Admin-Nutzer anlegen
    const user = await createUser({
      name,
      email,
      role: "admin",
      allowedTenants: [], // Mandanten-Logik in Public-Version deaktiviert
      authMethod: "credentials",
      passwordHash,
      passwordHistory: [passwordHash],
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      message: "Admin-Konto erfolgreich erstellt",
    });
  } catch (error) {
    console.error("Setup-Fehler:", error);
    return NextResponse.json(
      { error: "Admin-Konto konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}


