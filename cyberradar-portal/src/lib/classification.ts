// © 2025 CyberLage
import type { TenantClassification, TenantProfile, TenantSector } from "@/types/tenant";

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export const NIS2_SECTORS_WICHTIG: TenantSector[] = [];
export const NIS2_SECTORS_IMPORTANT: TenantSector[] = [];
export const DORA_SECTORS: TenantSector[] = [];
export const BUNDESLAND_LDA_MAP: Record<string, string> = {};

export function classifyTenant(_profile: TenantProfile): TenantClassification {
  return { nis2: null, dora: false, dsgvo: false, dsgvoAuthority: null };
}


