// © 2025 CyberLage
type DefenderSoftware = Record<string, unknown>;

// Tenant-specific logic disabled in public version
export async function upsertSoftwareInventory(_params: {
  tenantId: string;
  items: DefenderSoftware[];
}): Promise<number> {
  return 0;
}




