// © 2025 CyberLage
import type { Alert } from "@/types/alert";
import type { Tenant } from "@/types/tenant";

// Tenant-specific logic disabled in public version
export async function clearMatchesForTenant(_tenantId: string): Promise<number> {
  return 0;
}

export async function runMatchingForTenant(_params: { tenant: Tenant; alerts: Alert[] }): Promise<{ matchesCreated: number }> {
  return { matchesCreated: 0 };
}



