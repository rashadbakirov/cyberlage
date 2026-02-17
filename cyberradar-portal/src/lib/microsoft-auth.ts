// © 2025 CyberLage
// Tenant-specific logic disabled in public version
export function getCyberLageAppCredentials(): { clientId: string; clientSecret: string } {
  throw new Error("Microsoft integration is disabled in the public version.");
}

export async function getGraphAccessToken(): Promise<string> {
  throw new Error("Microsoft integration is disabled in the public version.");
}

export async function getDefenderAccessToken(): Promise<string> {
  throw new Error("Microsoft integration is disabled in the public version.");
}



