// © 2025 CyberLage
import { getUsersContainer } from "@/lib/cosmos";
import type { AuthAuditLog, PortalUser, PortalUserRole, SsoDomainMapping, UserAuthMethod } from "@/types/user";

// Web Crypto API für Edge-Runtime-Kompatibilität
function randomUUID(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function normalizeDomain(domain: string): string {
  return String(domain || "").trim().toLowerCase();
}

function normalizeAllowedTenants(value: string[] | undefined | null): string[] {
  const list = (value || []).map(v => String(v || "").trim()).filter(Boolean);
  return list.length ? Array.from(new Set(list)) : [];
}

export async function countUsers(): Promise<number> {
  const container = await getUsersContainer();
  const { resources } = await container.items
    .query<{ $1: number }>({
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.type = 'user'",
    })
    .fetchAll();
  return (resources as unknown as number[])[0] || 0;
}

export async function getUserById(id: string): Promise<PortalUser | null> {
  const container = await getUsersContainer();
  try {
    const { resource } = await container.item(id, id).read<PortalUser>();
    if (!resource || resource.type !== "user") return null;
    return resource;
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<PortalUser | null> {
  const emailLower = normalizeEmail(email);
  if (!emailLower) return null;
  const container = await getUsersContainer();
  const { resources } = await container.items
    .query<PortalUser>({
      query: "SELECT TOP 1 * FROM c WHERE c.type = 'user' AND c.emailLower = @email",
      parameters: [{ name: "@email", value: emailLower }],
    })
    .fetchAll();
  return resources[0] || null;
}

export async function listUsers(): Promise<PortalUser[]> {
  const container = await getUsersContainer();
  const { resources } = await container.items
    .query<PortalUser>({
      query: "SELECT * FROM c WHERE c.type = 'user' ORDER BY c.createdAt DESC",
    })
    .fetchAll();
  return resources || [];
}

export async function createUser(params: {
  name: string;
  email: string;
  role: PortalUserRole;
  allowedTenants: string[];
  authMethod: UserAuthMethod;
  passwordHash: string | null;
  passwordHistory?: string[];
}): Promise<PortalUser> {
  const emailLower = normalizeEmail(params.email);
  if (!emailLower) throw new Error("Ungültige E-Mail-Adresse");

  const existing = await getUserByEmail(emailLower);
  if (existing) throw new Error("Benutzer existiert bereits");

  const now = nowIso();
  const user: PortalUser = {
    id: `user_${randomUUID()}`,
    type: "user",
    email: params.email.trim(),
    emailLower,
    name: String(params.name || "").trim() || params.email.trim(),
    authMethod: params.authMethod,
    passwordHash: params.passwordHash,
    passwordHistory: (params.passwordHistory || []).slice(0, 5),
    role: params.role,
    allowedTenants: normalizeAllowedTenants(params.allowedTenants),
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  const container = await getUsersContainer();
  await container.items.create(user);
  return user;
}

export async function updateUser(id: string, updates: Partial<PortalUser>): Promise<PortalUser> {
  const existing = await getUserById(id);
  if (!existing) throw new Error("Benutzer nicht gefunden");

  const next: PortalUser = {
    ...existing,
    ...updates,
    email: updates.email ? updates.email.trim() : existing.email,
    emailLower: updates.email ? normalizeEmail(updates.email) : existing.emailLower,
    name: updates.name ? String(updates.name).trim() : existing.name,
    allowedTenants: updates.allowedTenants ? normalizeAllowedTenants(updates.allowedTenants) : existing.allowedTenants,
    passwordHistory: updates.passwordHistory ? updates.passwordHistory.slice(0, 5) : existing.passwordHistory,
    updatedAt: nowIso(),
  };

  const container = await getUsersContainer();
  await container.items.upsert(next);
  return next;
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  await updateUser(userId, { failedAttempts: 0, lockedUntil: null, lastLoginAt: nowIso() });
}

export async function recordFailedLogin(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  const nextAttempts = (user.failedAttempts || 0) + 1;

  let lockedUntil: string | null = user.lockedUntil || null;
  const now = Date.now();
  if (nextAttempts >= 20) {
    // Sperre bis Admin entsperrt (weit in der Zukunft)
    lockedUntil = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
  } else if (nextAttempts >= 10) {
    lockedUntil = new Date(now + 60 * 60 * 1000).toISOString();
  } else if (nextAttempts >= 5) {
    lockedUntil = new Date(now + 15 * 60 * 1000).toISOString();
  }

  await updateUser(userId, { failedAttempts: nextAttempts, lockedUntil });
}

export async function bumpTokenVersion(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  await updateUser(userId, { tokenVersion: (user.tokenVersion || 0) + 1 });
}

export async function getDomainMapping(domain: string): Promise<SsoDomainMapping | null> {
  const domainLower = normalizeDomain(domain);
  if (!domainLower) return null;
  const container = await getUsersContainer();
  const { resources } = await container.items
    .query<SsoDomainMapping>({
      query: "SELECT TOP 1 * FROM c WHERE c.type = 'sso_domain' AND c.domainLower = @domain",
      parameters: [{ name: "@domain", value: domainLower }],
    })
    .fetchAll();
  const mapping = resources[0] || null;
  if (!mapping || mapping.type !== "sso_domain") return null;
  return mapping;
}

export async function listDomainMappings(): Promise<SsoDomainMapping[]> {
  const container = await getUsersContainer();
  const { resources } = await container.items
    .query<SsoDomainMapping>({
      query: "SELECT * FROM c WHERE c.type = 'sso_domain' ORDER BY c.domainLower ASC",
    })
    .fetchAll();
  return resources || [];
}

export async function upsertDomainMapping(params: {
  id?: string;
  domain: string;
  allowedTenants: string[];
  defaultRole: PortalUserRole;
  autoProvision: boolean;
  isActive?: boolean;
}): Promise<SsoDomainMapping> {
  const now = nowIso();
  const domainLower = normalizeDomain(params.domain);
  if (!domainLower) throw new Error("Ungültige Domain");

  const mapping: SsoDomainMapping = {
    id: params.id || `sso_domain_${randomUUID()}`,
    type: "sso_domain",
    domain: params.domain.trim(),
    domainLower,
    allowedTenants: normalizeAllowedTenants(params.allowedTenants),
    defaultRole: params.defaultRole,
    autoProvision: Boolean(params.autoProvision),
    isActive: params.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const container = await getUsersContainer();
  await container.items.upsert(mapping);
  return mapping;
}

export async function upsertSsoUser(params: { email: string; name?: string | null }, mapping: SsoDomainMapping): Promise<PortalUser> {
  const emailLower = normalizeEmail(params.email);
  if (!emailLower) throw new Error("Ungültige E-Mail-Adresse");

  const existing = await getUserByEmail(emailLower);
  const allowedTenants = mapping.allowedTenants || [];
  if (existing) {
    return updateUser(existing.id, {
      isActive: true,
      authMethod: "sso",
      name: params.name ? String(params.name).trim() : existing.name,
      role: existing.role || mapping.defaultRole,
      allowedTenants: existing.allowedTenants?.length ? existing.allowedTenants : allowedTenants,
    });
  }

  return createUser({
    name: params.name ? String(params.name).trim() : params.email,
    email: params.email,
    role: mapping.defaultRole,
    allowedTenants,
    authMethod: "sso",
    passwordHash: null,
    passwordHistory: [],
  });
}

export async function logAuthAudit(params: Omit<AuthAuditLog, "id" | "type" | "timestamp"> & { timestamp?: string }): Promise<void> {
  const record: AuthAuditLog = {
    id: `audit_${randomUUID()}`,
    type: "audit",
    userId: params.userId,
    action: params.action,
    tenantId: params.tenantId ?? null,
    details: params.details || "",
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    timestamp: params.timestamp || nowIso(),
    success: Boolean(params.success),
  };

  const container = await getUsersContainer();
  await container.items.create(record);
}


