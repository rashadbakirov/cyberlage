// © 2025 CyberLage
import type { Alert } from "@/types/alert";
import type { TenantAsset } from "@/types/tenant";

// Tenant-specific logic disabled in public version
export function matchByCpe(_alert: Alert, _asset: TenantAsset): boolean {
  return false;
}



