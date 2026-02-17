// © 2025 CyberLage
export type PortalUserRole = "admin" | "manager" | "viewer";

export type UserAuthMethod = "credentials" | "sso";

export type UsersContainerRecordType = "user" | "sso_domain" | "audit";

export interface PortalUser {
  id: string; // "user_xxx" (Cosmos id + partition key)
  type: "user";

  email: string;
  emailLower: string;
  name: string;

  authMethod: UserAuthMethod;
  passwordHash: string | null;
  passwordHistory: string[];

  role: PortalUserRole;
  allowedTenants: string[]; // tenant ids, or ["*"] for all

  isActive: boolean;
  failedAttempts: number;
  lockedUntil: string | null;

  tokenVersion: number;

  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface SsoDomainMapping {
  id: string; // "sso_domain_xxx"
  type: "sso_domain";
  domain: string;
  domainLower: string;

  allowedTenants: string[]; // tenant ids, or ["*"]
  defaultRole: PortalUserRole;
  autoProvision: boolean;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | "login"
  | "logout"
  | "tenant_access"
  | "tenant_access_denied"
  | "tenant_connect"
  | "tenant_sync"
  | "report_generate"
  | "user_create"
  | "user_update"
  | "user_disable"
  | "settings_change";

export interface AuthAuditLog {
  id: string; // "audit_xxx"
  type: "audit";
  userId: string;
  action: AuditAction;
  tenantId: string | null;
  details: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  success: boolean;
}



