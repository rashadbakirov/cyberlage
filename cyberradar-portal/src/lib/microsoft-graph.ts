// © 2025 CyberLage
export async function graphGet<T>(accessToken: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph GET failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}

export async function getOrganization(accessToken: string): Promise<{ id: string; displayName?: string }> {
  const data = await graphGet<{ value: Array<{ id: string; displayName?: string }> }>(
    accessToken,
    "https://graph.microsoft.com/v1.0/organization?$select=id,displayName"
  );
  return data.value?.[0] || { id: "unknown" };
}

export type GraphIncident = {
  id: string;
  displayName?: string;
  status?: string;
  severity?: string;
  createdDateTime?: string;
  lastUpdateDateTime?: string;
  assignedTo?: string;
  classification?: string;
  determination?: string;
  alerts?: unknown[];
};

export async function listSecurityIncidents(accessToken: string, params?: { days?: number; top?: number }): Promise<GraphIncident[]> {
  const top = Math.min(params?.top || 50, 100);
  const days = Math.min(Math.max(params?.days || 30, 1), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const filter = encodeURIComponent(`createdDateTime ge ${since}`);
  let url = `https://graph.microsoft.com/v1.0/security/incidents?$expand=alerts&$top=${top}&$filter=${filter}`;

  const incidents: GraphIncident[] = [];
  for (let i = 0; i < 5 && url; i += 1) {
    const data = await graphGet<{ value: GraphIncident[]; "@odata.nextLink"?: string }>(accessToken, url);
    incidents.push(...(data.value || []));
    url = data["@odata.nextLink"] || "";
  }

  return incidents;
}



