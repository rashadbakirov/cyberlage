// © 2025 CyberLage
import type { Locale } from "@/lib/translations";

export type MeldungPhase = "erstmeldung" | "meldung" | "abschluss";

export interface MeldungDraft {
  // Meta
  id: string;
  alertId: string;
  createdAt: string;
  phase: MeldungPhase;

  // Abschnitt 1: Kontaktdaten (Benutzer ergänzt, wir liefern Platzhalter)
  kontakt: {
    organisation: string;
    ansprechpartner: string;
    telefon: string;
    email: string;
    rolle: string;
  };

  // Abschnitt 2: Vorfallbeschreibung (KI füllt vorab)
  vorfall: {
    einstufung: "erheblich" | "sicherheitsvorfall" | "beinahevorfall";
    meldegrund: string;
    zeitpunktEntdeckung: string;
    zeitpunktEintritt: string;
    beschreibung: string;
    lageeinschaetzung: string;
  };

  // Abschnitt 3: Technische Details (automatisch aus Alert-Daten)
  technik: {
    betroffeneSysteme: string[];
    betroffeneVersionen: string[];
    hersteller: string[];
    cveIds: string[];
    cvssScore: number | null;
    epssScore: number | null;
    angriffsvektor: string;
    iocs: string[];
    istAktivAusgenutzt: boolean;
    istZeroDay: boolean;
  };

  // Abschnitt 4: Auswirkungen (KI schlägt vor, Nutzer bestätigt)
  auswirkungen: {
    beschreibung: string;
    betroffeneDienste: string;
    finanziellauswirkung: string;
    datenBetroffen: boolean | null;
    personenBetroffen: boolean | null;
  };

  // Abschnitt 5: Maßnahmen (KI schlägt basierend auf Handlungsempfehlungen vor)
  massnahmen: {
    sofortmassnahmen: string[];
    statusEindaemmung: string;
  };

  // Abschnitt 6: Rechtsgrundlage
  rechtsgrundlage: {
    paragraphen: string[];
    rahmenwerk: string;
    meldepflichtBegruendung: string;
  };

  // Fristen
  fristen: {
    kenntnisnahme: string;
    erstmeldungDeadline: string;
    meldungDeadline: string;
    abschlussDeadline: string;
  };

  bsiLinks?: {
    meldung?: string;
    info?: string;
  };
}

/**
 * Prüft, ob eine Meldung als meldepflicht-relevant markiert werden sollte.
 */
export function isMeldepflichtRelevant(alert: {
  compliance?: {
    nis2?: {
      relevant?: string;
      reportingRequired?: boolean;
    } | null;
  } | null;
  isActivelyExploited?: boolean;
  isZeroDay?: boolean;
  severity?: string | null;
  cvssScore?: number | null;
  aiScore?: number | null;
}): boolean {
  const nis2 = alert.compliance?.nis2;

  // Direkter Hinweis aus der Anreicherung
  if (nis2?.reportingRequired) return true;

  // NIS2 relevant + aktiv ausgenutzt
  if (nis2?.relevant === "yes" && alert.isActivelyExploited) return true;

  // Kritisch + aktiv ausgenutzt + hoher CVSS
  if (
    alert.isActivelyExploited &&
    String(alert.severity || "").toLowerCase() === "critical" &&
    (alert.cvssScore ?? 0) >= 9.0
  ) {
    return true;
  }

  // Zero-Day mit kritischer Schwere
  if (alert.isZeroDay && String(alert.severity || "").toLowerCase() === "critical") return true;

  return false;
}

/**
 * Berechnet die BSI-Fristen ab Kenntnisnahme
 */
export function calculateDeadlines(kenntnisnahme: Date): {
  erstmeldung: Date;
  meldung: Date;
  abschluss: Date;
} {
  return {
    erstmeldung: new Date(kenntnisnahme.getTime() + 24 * 60 * 60 * 1000),
    meldung: new Date(kenntnisnahme.getTime() + 72 * 60 * 60 * 1000),
    abschluss: new Date(kenntnisnahme.getTime() + 30 * 24 * 60 * 60 * 1000),
  };
}

/**
 * Liefert die Meldepflicht-Schwere für den Kontext.
 */
export function getMeldepflichtSeverity(alert: {
  isActivelyExploited?: boolean;
  isZeroDay?: boolean;
  severity?: string | null;
  cvssScore?: number | null;
}): "kritisch" | "hoch" | "mittel" {
  if (alert.isActivelyExploited && String(alert.severity || "").toLowerCase() === "critical") return "kritisch";
  if (alert.isActivelyExploited || alert.isZeroDay) return "hoch";
  return "mittel";
}

export const BSI_LINKS = {
  mip: "https://mip2.bsi.bund.de",
  mipMeldung: "https://mip2.bsi.bund.de/de/meldestellen-uebersicht/",
  mipRegistrierung: "https://mip2.bsi.bund.de/de/",
  bsiNis2Info:
    "https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/NIS-2-Infopakete/NIS-2-Meldepflicht/NIS-2-Meldepflicht_node.html",
  bsiAnleitung:
    "https://www.bsi.bund.de/DE/Themen/Regulierte-Wirtschaft/NIS-2-regulierte-Unternehmen/NIS-2-Infopakete/NIS-2-Meldepflicht/NIS-2-Meldepflicht.html",
  bsiKontakt: "mailto:Kritische.Infrastrukturen@bsi.bund.de",
} as const;

export const COMPLIANCE_REPORTING_LINKS = {
  nis2: {
    label: "BSI MIP (NIS2/BSIG)",
    url: "https://mip2.bsi.bund.de/de/meldestellen-uebersicht/",
    authority: "BSI",
  },
  dora: {
    label: "BaFin MVP-Portal (DORA)",
    url: "https://www.bafin.de/DE/DieBaFin/Service/MVP-Portal/mvp_portal_node.html",
    authority: "BaFin",
  },
  gdpr: {
    label: "DSK Aufsichtsbehörden (DSGVO)",
    url: "https://www.datenschutzkonferenz-online.de/aufsichtsbehoerden.html",
    authority: "Landes-/Bundesdatenschutzbehörde",
  },
} as const;

export function getComplianceReportingLinks(input: {
  nis2Applicable?: boolean;
  doraApplicable?: boolean;
  gdprApplicable?: boolean;
}): Array<{ key: "nis2" | "dora" | "gdpr"; label: string; url: string; authority: string }> {
  const links: Array<{ key: "nis2" | "dora" | "gdpr"; label: string; url: string; authority: string }> = [];
  if (input.nis2Applicable) links.push({ key: "nis2", ...COMPLIANCE_REPORTING_LINKS.nis2 });
  if (input.doraApplicable) links.push({ key: "dora", ...COMPLIANCE_REPORTING_LINKS.dora });
  if (input.gdprApplicable) links.push({ key: "gdpr", ...COMPLIANCE_REPORTING_LINKS.gdpr });
  return links;
}

export function formatDraftAsText(draft: MeldungDraft, _lang: Locale): string {
  const title = "BSI NIS2 Melde-Entwurf (KI-Assistent)";
  const sep = "══════════════════════════════════════════";

  return `
${title}
${sep}

1. KONTAKTDATEN
Organisation: ${draft.kontakt.organisation}
Ansprechpartner: ${draft.kontakt.ansprechpartner}
Telefon: ${draft.kontakt.telefon}
E-Mail: ${draft.kontakt.email}
Rolle: ${draft.kontakt.rolle}

2. VORFALL
Einstufung: ${draft.vorfall.einstufung}
Meldegrund: ${draft.vorfall.meldegrund}
Zeitpunkt Entdeckung: ${draft.vorfall.zeitpunktEntdeckung}
Zeitpunkt Eintritt: ${draft.vorfall.zeitpunktEintritt}

3. BESCHREIBUNG
${draft.vorfall.beschreibung}

4. LAGEEINSCHÄTZUNG
${draft.vorfall.lageeinschaetzung}

5. TECHNISCHE DETAILS
CVE-IDs: ${draft.technik.cveIds.join(", ") || "Keine"}
CVSS: ${draft.technik.cvssScore ?? "—"}
EPSS: ${draft.technik.epssScore !== null && draft.technik.epssScore !== undefined ? `${(draft.technik.epssScore * 100).toFixed(1)}%` : "—"}
Betroffene Systeme: ${draft.technik.betroffeneSysteme.join(", ") || "—"}
Betroffene Versionen: ${draft.technik.betroffeneVersionen.join(", ") || "—"}
Hersteller: ${draft.technik.hersteller.join(", ") || "—"}
Angriffsvektor: ${draft.technik.angriffsvektor}
Aktiv ausgenutzt: ${draft.technik.istAktivAusgenutzt ? "JA" : "Nein"}
Zero-Day: ${draft.technik.istZeroDay ? "JA" : "Nein"}

6. AUSWIRKUNGEN
${draft.auswirkungen.beschreibung}
Betroffene Dienste: ${draft.auswirkungen.betroffeneDienste}

7. SOFORTMAßNAHMEN
${draft.massnahmen.sofortmassnahmen.map((m, i) => `${i + 1}. ${m}`).join("\n")}
Status Eindämmung: ${draft.massnahmen.statusEindaemmung}

8. RECHTSGRUNDLAGE
${draft.rechtsgrundlage.paragraphen.join(", ")}
${draft.rechtsgrundlage.meldepflichtBegruendung}

${sep}
FRISTEN
Kenntnisnahme: ${new Date(draft.fristen.kenntnisnahme).toLocaleString("de-DE")}
Erstmeldung bis: ${new Date(draft.fristen.erstmeldungDeadline).toLocaleString("de-DE")}
Vollständige Meldung bis: ${new Date(draft.fristen.meldungDeadline).toLocaleString("de-DE")}
Abschlussmeldung bis: ${new Date(draft.fristen.abschlussDeadline).toLocaleString("de-DE")}

BSI-Portal: ${BSI_LINKS.mip}
${sep}
⚠️ KI-generierter Entwurf — bitte prüfen und ergänzen.
`.trim();
}


