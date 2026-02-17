// © 2025 CyberLage
import { auth } from "./auth";
import { NextResponse } from "next/server";
import { logAuthAudit } from "./auth-store";
import type { Session } from "next-auth";

export interface TenantAccessResult {
  authorized: true;
  session: Session;
  error?: never;
}

export interface TenantAccessError {
  authorized: false;
  session?: never;
  error: NextResponse;
}

export type TenantAccessCheck = TenantAccessResult | TenantAccessError;

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export async function requireTenantAccess(): Promise<TenantAccessCheck> {
  return {
    authorized: false,
    error: NextResponse.json(
      { error: "Mandantenfunktionen sind in der Public-Version deaktiviert." },
      { status: 501 }
    ),
  };
}

// Rollenprüfung für geschützte Bereiche
export async function requireRole(
  allowedRoles: string[],
  request?: Request
): Promise<{ authorized: boolean; session?: Session; error?: NextResponse }> {
  const session = await auth();

  if (!session || !session.user) {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(session.user.role)) {
    const ipAddress = request?.headers.get("x-forwarded-for") || null;
    const userAgent = request?.headers.get("user-agent") || null;

    await logAuthAudit({
      userId: session.user.userId,
      action: "tenant_access_denied",
      tenantId: null,
      details: `Rolle unzureichend: ${session.user.role}`,
      ipAddress,
      userAgent,
      success: false,
    });

    return {
      authorized: false,
      error: NextResponse.json(
        { error: "Nicht autorisiert: Unzureichende Berechtigung" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

// Tenant-Filter deaktiviert
export function filterAllowedTenants(): string[] {
  return [];
}

// Session abrufen
export async function getSession(): Promise<Session | null> {
  return await auth();
}

// Authentifizierung prüfen
export async function requireAuth(): Promise<{
  authenticated: boolean;
  session?: Session;
  error?: NextResponse;
}> {
  const session = await auth();

  if (!session || !session.user) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 }),
    };
  }

  return { authenticated: true, session };
}


