// © 2025 CyberLage
import type { Tenant, TenantConnection, TenantProfile } from "@/types/tenant";

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export async function listTenants(): Promise<Tenant[]> {
  return [];
}

export async function getTenantById(_id: string): Promise<Tenant | null> {
  return null;
}

export async function createTenant(_params: { profile: TenantProfile; connection?: Partial<TenantConnection> }): Promise<Tenant> {
  throw new Error("Mandantenverwaltung ist in der Public-Version deaktiviert.");
}

export async function updateTenant(
  _id: string,
  _updates: Partial<Omit<Tenant, "id" | "createdAt" | "connection">> & { connection?: Partial<Tenant["connection"]> }
): Promise<Tenant> {
  throw new Error("Mandantenverwaltung ist in der Public-Version deaktiviert.");
}

export async function deleteTenant(_id: string): Promise<void> {
  return;
}


