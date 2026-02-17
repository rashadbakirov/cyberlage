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

// Tenant-specific logic disabled in public version
export async function requireTenantAccess(): Promise<TenantAccessCheck> {
  return {
    authorized: false,
    error: NextResponse.json(
      { error: "Tenant features are disabled in the public version." },
      { status: 501 }
    ),
  };
}

// Role checks for protected areas
export async function requireRole(
  allowedRoles: string[],
  request?: Request
): Promise<{ authorized: boolean; session?: Session; error?: NextResponse }> {
  const session = await auth();

  if (!session || !session.user) {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(session.user.role)) {
    const ipAddress = request?.headers.get("x-forwarded-for") || null;
    const userAgent = request?.headers.get("user-agent") || null;

    await logAuthAudit({
      userId: session.user.userId,
      action: "tenant_access_denied",
      tenantId: null,
      details: `Insufficient role: ${session.user.role}`,
      ipAddress,
      userAgent,
      success: false,
    });

    return {
      authorized: false,
      error: NextResponse.json(
        { error: "Unauthorized: insufficient permission" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

// Tenant filter disabled
export function filterAllowedTenants(): string[] {
  return [];
}

// Get current session
export async function getSession(): Promise<Session | null> {
  return await auth();
}

// Check authentication
export async function requireAuth(): Promise<{
  authenticated: boolean;
  session?: Session;
  error?: NextResponse;
}> {
  const session = await auth();

  if (!session || !session.user) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { authenticated: true, session };
}



