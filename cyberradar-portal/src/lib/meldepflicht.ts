// © 2025 CyberLage
import type { Locale } from "@/lib/translations";

export type MeldungPhase = "erstmeldung" | "meldung" | "abschluss";

export interface MeldungDraft {
  // Meta
  id: string;
  alertId: string;
  createdAt: string;
  phase: MeldungPhase;

  // Section 1: contact information (user completes placeholders)
  kontakt: {
    organisation: string;
    ansprechpartner: string;
    telefon: string;
    email: string;
    rolle: string;
  };

  // Section 2: incident description (pre-filled by AI)
  vorfall: {
    einstufung: "erheblich" | "sicherheitsvorfall" | "beinahevorfall";
    meldegrund: string;
    zeitpunktEntdeckung: string;
    zeitpunktEintritt: string;
    beschreibung: string;
    lageeinschaetzung: string;
  };

  // Section 3: technical details (from alert data)
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

  // Section 4: impact (AI suggests, user confirms)
  auswirkungen: {
    beschreibung: string;
    betroffeneDienste: string;
    finanziellauswirkung: string;
    datenBetroffen: boolean | null;
    personenBetroffen: boolean | null;
  };

  // Section 5: actions (AI suggestions based on recommendations)
  massnahmen: {
    sofortmassnahmen: string[];
    statusEindaemmung: string;
  };

  // Section 6: legal basis
  rechtsgrundlage: {
    paragraphen: string[];
    rahmenwerk: string;
    meldepflichtBegruendung: string;
  };

  // Deadlines
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
 * Checks whether a report should be marked as reporting-relevant.
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

  // Direct signal from enrichment
  if (nis2?.reportingRequired) return true;

  // NIS2 relevant + actively exploited
  if (nis2?.relevant === "yes" && alert.isActivelyExploited) return true;

  // Critical + actively exploited + high CVSS
  if (
    alert.isActivelyExploited &&
    String(alert.severity || "").toLowerCase() === "critical" &&
    (alert.cvssScore ?? 0) >= 9.0
  ) {
    return true;
  }

  // Zero-day with critical severity
  if (alert.isZeroDay && String(alert.severity || "").toLowerCase() === "critical") return true;

  return false;
}

/**
 * Calculates BSI deadlines based on awareness time.
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
 * Returns reporting urgency for context.
 */
export function getMeldepflichtSeverity(alert: {
  isActivelyExploited?: boolean;
  isZeroDay?: boolean;
  severity?: string | null;
  cvssScore?: number | null;
}): "critical" | "high" | "medium" {
  if (alert.isActivelyExploited && String(alert.severity || "").toLowerCase() === "critical") return "critical";
  if (alert.isActivelyExploited || alert.isZeroDay) return "high";
  return "medium";
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
    label: "DSK supervisory authorities (GDPR)",
    url: "https://www.datenschutzkonferenz-online.de/aufsichtsbehoerden.html",
    authority: "State/Federal data protection authority",
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
  const title = "BSI NIS2 Report Draft (AI Assistant)";
  const sep = "══════════════════════════════════════════";

  return `
${title}
${sep}

1. CONTACT INFORMATION
Organization: ${draft.kontakt.organisation}
Contact person: ${draft.kontakt.ansprechpartner}
Phone: ${draft.kontakt.telefon}
Email: ${draft.kontakt.email}
Role: ${draft.kontakt.rolle}

2. INCIDENT
Classification: ${draft.vorfall.einstufung}
Reporting reason: ${draft.vorfall.meldegrund}
Discovery time: ${draft.vorfall.zeitpunktEntdeckung}
Occurrence time: ${draft.vorfall.zeitpunktEintritt}

3. DESCRIPTION
${draft.vorfall.beschreibung}

4. SITUATION ASSESSMENT
${draft.vorfall.lageeinschaetzung}

5. TECHNICAL DETAILS
CVE IDs: ${draft.technik.cveIds.join(", ") || "None"}
CVSS: ${draft.technik.cvssScore ?? "—"}
EPSS: ${draft.technik.epssScore !== null && draft.technik.epssScore !== undefined ? `${(draft.technik.epssScore * 100).toFixed(1)}%` : "—"}
Affected systems: ${draft.technik.betroffeneSysteme.join(", ") || "—"}
Affected versions: ${draft.technik.betroffeneVersionen.join(", ") || "—"}
Vendors: ${draft.technik.hersteller.join(", ") || "—"}
Attack vector: ${draft.technik.angriffsvektor}
Actively exploited: ${draft.technik.istAktivAusgenutzt ? "YES" : "No"}
Zero-day: ${draft.technik.istZeroDay ? "YES" : "No"}

6. IMPACT
${draft.auswirkungen.beschreibung}
Affected services: ${draft.auswirkungen.betroffeneDienste}

7. IMMEDIATE ACTIONS
${draft.massnahmen.sofortmassnahmen.map((m, i) => `${i + 1}. ${m}`).join("\n")}
Containment status: ${draft.massnahmen.statusEindaemmung}

8. LEGAL BASIS
${draft.rechtsgrundlage.paragraphen.join(", ")}
${draft.rechtsgrundlage.meldepflichtBegruendung}

${sep}
DEADLINES
Awareness time: ${new Date(draft.fristen.kenntnisnahme).toLocaleString("en-US")}
Early warning due: ${new Date(draft.fristen.erstmeldungDeadline).toLocaleString("en-US")}
Full report due: ${new Date(draft.fristen.meldungDeadline).toLocaleString("en-US")}
Final report due: ${new Date(draft.fristen.abschlussDeadline).toLocaleString("en-US")}

BSI portal: ${BSI_LINKS.mip}
${sep}
AI-generated draft - please review and complete.
`.trim();
}




