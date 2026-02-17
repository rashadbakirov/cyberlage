// © 2025 CyberLage
// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export function getCyberLageAppCredentials(): { clientId: string; clientSecret: string } {
  throw new Error("Microsoft-Integration ist in der Public-Version deaktiviert.");
}

export async function getGraphAccessToken(): Promise<string> {
  throw new Error("Microsoft-Integration ist in der Public-Version deaktiviert.");
}

export async function getDefenderAccessToken(): Promise<string> {
  throw new Error("Microsoft-Integration ist in der Public-Version deaktiviert.");
}


