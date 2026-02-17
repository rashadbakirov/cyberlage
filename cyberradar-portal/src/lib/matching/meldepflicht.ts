// © 2025 CyberLage
import type { Alert } from "@/types/alert";
import type { Tenant } from "@/types/tenant";

// Tenant-specific logic disabled in public version
export function assessMeldepflicht(_params: { tenant: Tenant; alert: Alert }) {
  return {
    nis2: null,
    dora: null,
    dsgvo: null,
  };
}



