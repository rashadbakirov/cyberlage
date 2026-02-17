// © 2025 CyberLage
// Zeitfenster-Logik

export type WindowKey = "24h" | "7d" | "30d" | "all";

export function parseWindowKey(input: string | null | undefined, fallback: WindowKey): WindowKey {
  switch ((input || "").trim().toLowerCase()) {
    case "24h":
    case "1d":
      return "24h";
    case "7d":
      return "7d";
    case "30d":
      return "30d";
    case "all":
      return "all";
    default:
      return fallback;
  }
}

export function resolveTimeRange(input: {
  window?: string | null;
  from?: string | null;
  to?: string | null;
  defaultWindow: WindowKey;
  now?: Date;
}): { window: WindowKey; from?: string; to?: string } {
  const now = input.now ?? new Date();
  const window = parseWindowKey(input.window, input.defaultWindow);

  const from = parseIsoOrUndefined(input.from);
  const to = parseIsoOrUndefined(input.to);

  if (from || to) {
    return {
      window,
      from,
      to: to ?? now.toISOString(),
    };
  }

  if (window === "all") {
    return { window };
  }

  const ms =
    window === "24h" ? 24 * 60 * 60 * 1000 :
    window === "7d" ? 7 * 24 * 60 * 60 * 1000 :
    30 * 24 * 60 * 60 * 1000;

  return {
    window,
    from: new Date(now.getTime() - ms).toISOString(),
    to: now.toISOString(),
  };
}

function parseIsoOrUndefined(value: string | null | undefined): string | undefined {
  const s = (value || "").trim();
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}



