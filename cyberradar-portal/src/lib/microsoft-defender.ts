// © 2025 CyberLage
export async function defenderGet<T>(accessToken: string, path: string): Promise<T> {
  // Microsoft Defender for Endpoint (MDE) API base
  // Docs use: https://api.securitycenter.microsoft.com/api/...
  const url = path.startsWith("http") ? path : `https://api.securitycenter.microsoft.com${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Defender GET failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}

export type DefenderSoftware = {
  id?: string;
  vendor?: string;
  name?: string;
  version?: string;
  exposedMachines?: number;
  publicExploit?: boolean;
  weaknesses?: number;
};

export type DefenderMachine = {
  id: string;
  computerDnsName?: string;
  osPlatform?: string;
  osVersion?: string;
  riskScore?: string;
  exposureLevel?: string;
  healthStatus?: string;
};

export async function listSoftware(accessToken: string): Promise<DefenderSoftware[]> {
  const data = await defenderGet<{ value: DefenderSoftware[] }>(accessToken, "/api/Software");
  return data.value || [];
}

export async function listMachines(accessToken: string): Promise<DefenderMachine[]> {
  const data = await defenderGet<{ value: DefenderMachine[] }>(accessToken, "/api/machines");
  return data.value || [];
}


