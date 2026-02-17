// © 2025 CyberLage
type DefenderSoftware = Record<string, unknown>;

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export async function upsertSoftwareInventory(_params: {
  tenantId: string;
  items: DefenderSoftware[];
}): Promise<number> {
  return 0;
}



