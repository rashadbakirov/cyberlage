// © 2025 CyberLage
import type { Alert } from "@/types/alert";
import type { TenantAsset } from "@/types/tenant";

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export function matchByCpe(_alert: Alert, _asset: TenantAsset): boolean {
  return false;
}


