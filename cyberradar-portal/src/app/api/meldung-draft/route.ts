// © 2025 CyberLage
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { Alert } from "@/types/alert";
import { getAlertById } from "@/lib/cosmos";
import {
  BSI_LINKS,
  calculateDeadlines,
  type MeldungDraft,
  type MeldungPhase,
} from "@/lib/meldepflicht";
import { getOpenAIClient } from "@/lib/openai";

type RequestBody = {
  alertId?: string;
  phase?: MeldungPhase;
  kenntnisnahme?: string;
};

type AiDraftParts = Partial<
  Pick<MeldungDraft, "vorfall" | "auswirkungen" | "massnahmen" | "rechtsgrundlage">
> & {
  technik?: Partial<Pick<MeldungDraft["technik"], "angriffsvektor" | "iocs">>;
};

const SYSTEM_PROMPT = `Du bist ein Incident-Response- und NIS2/BSIG-Compliance-Assistent.

Aufgabe: Erstelle einen **Entwurf** für eine Meldung an das BSI (MIP). Der Entwurf dient nur zur Vorbereitung; keine automatische Übermittlung.

WICHTIGE REGELN:
1) Nutze ausschließlich die bereitgestellten Alert-Daten. Erfinde keine Fakten (keine IOCs, Zeiten, Schäden), wenn sie nicht im Alert stehen.
2) Wenn etwas unbekannt ist, schreibe "unbekannt" oder lasse das Feld leer (""), aber liefere trotzdem ein gültiges JSON.
3) Schreibe auf Deutsch, präzise und professionell (CISO/IR geeignet).
4) Gib **nur JSON** zurück (kein Markdown, keine Erklärungen).`;

function stripJsonFences(text: string): string {
  return text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

function safeString(value: unknown, maxLen = 2000): string {
  if (typeof value !== "string") return "";
  const s = value.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function safeStringArray(value: unknown, maxItems = 20, maxLen = 160): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(v => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems)
    .map(v => (v.length > maxLen ? v.slice(0, maxLen) : v));
}

function safeBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function buildUserPrompt(alert: Alert, phase: MeldungPhase, kenntnisnahmeIso: string): string {
  const nis2 = alert.compliance?.nis2 || null;
  const nis2Refs = nis2?.references?.slice(0, 6) || [];
  const actionItems = nis2?.actionItemsDe?.slice(0, 6) || [];

  return `PHASE: ${phase}
KENNTNISNAHME (ISO): ${kenntnisnahmeIso}

ALERT:
Titel: ${alert.titleDe || alert.title}
Quelle: ${alert.sourceName || alert.sourceId}
Veröffentlicht: ${alert.publishedAt || alert.fetchedAt}
Schweregrad: ${alert.severity || "unbekannt"}
AI Score: ${typeof alert.aiScore === "number" ? alert.aiScore : "—"}
Aktiv ausgenutzt: ${alert.isActivelyExploited ? "JA" : "Nein"}
Zero-Day: ${alert.isZeroDay ? "JA" : "Nein"}

Beschreibung/Zusammenfassung:
${(alert.summaryDe || alert.summary || alert.description || "").trim()}

Technische Daten:
CVEs: ${(alert.cveIds || []).slice(0, 30).join(", ") || "Keine"}
CVSS: ${alert.cvssScore ?? "—"}
EPSS: ${alert.epssScore ?? "—"}
Betroffene Produkte: ${(alert.affectedProducts || []).slice(0, 20).join(", ") || "unbekannt"}
Betroffene Versionen: ${(alert.affectedVersions || []).slice(0, 20).join(", ") || "unbekannt"}
Hersteller: ${(alert.affectedVendors || []).slice(0, 20).join(", ") || "unbekannt"}

NIS2/BSIG (falls vorhanden):
Relevant: ${nis2?.relevant || "unbekannt"}
ReportingRequired: ${nis2?.reportingRequired ? "true" : "false"}
Referenzen: ${nis2Refs.join(", ") || "—"}
Begründung: ${nis2?.reasoning || "—"}
Empfohlene Maßnahmen: ${actionItems.join(" | ") || "—"}

Gib ein JSON Objekt zurück mit genau diesen Feldern:
{
  "vorfall": {
    "einstufung": "erheblich|sicherheitsvorfall|beinahevorfall",
    "meldegrund": "...",
    "zeitpunktEntdeckung": "...",
    "zeitpunktEintritt": "...",
    "beschreibung": "...",
    "lageeinschaetzung": "..."
  },
  "technik": {
    "angriffsvektor": "...",
    "iocs": ["..."]
  },
  "auswirkungen": {
    "beschreibung": "...",
    "betroffeneDienste": "...",
    "finanziellauswirkung": "...",
    "datenBetroffen": true|false|null,
    "personenBetroffen": true|false|null
  },
  "massnahmen": {
    "sofortmassnahmen": ["..."],
    "statusEindaemmung": "..."
  },
  "rechtsgrundlage": {
    "paragraphen": ["..."],
    "rahmenwerk": "BSIG/NIS2",
    "meldepflichtBegruendung": "..."
  }
}

Hinweise:
- ZeitpunktEntdeckung kann standardmäßig der Kenntnisnahme entsprechen, wenn nicht anders bekannt.
- IOCs nur wenn in den Daten vorhanden, ansonsten [].
- Sofortmaßnahmen: 2-5 konkrete Punkte, möglichst mit Produktname/CVE (wenn vorhanden).`;
}

function mergeAiParts(base: MeldungDraft, ai: AiDraftParts | null): MeldungDraft {
  if (!ai) return base;

  const out: MeldungDraft = { ...base };

  if (ai.vorfall) {
    out.vorfall = {
      ...out.vorfall,
      einstufung:
        ai.vorfall.einstufung === "erheblich" ||
        ai.vorfall.einstufung === "sicherheitsvorfall" ||
        ai.vorfall.einstufung === "beinahevorfall"
          ? ai.vorfall.einstufung
          : out.vorfall.einstufung,
      meldegrund: safeString(ai.vorfall.meldegrund, 400),
      zeitpunktEntdeckung: safeString(ai.vorfall.zeitpunktEntdeckung, 80) || out.vorfall.zeitpunktEntdeckung,
      zeitpunktEintritt: safeString(ai.vorfall.zeitpunktEintritt, 80) || out.vorfall.zeitpunktEintritt,
      beschreibung: safeString(ai.vorfall.beschreibung, 2000),
      lageeinschaetzung: safeString(ai.vorfall.lageeinschaetzung, 1200),
    };
  }

  if (ai.technik) {
    out.technik = {
      ...out.technik,
      angriffsvektor: safeString(ai.technik.angriffsvektor, 200) || out.technik.angriffsvektor,
      iocs: safeStringArray(ai.technik.iocs, 20, 200),
    };
  }

  if (ai.auswirkungen) {
    out.auswirkungen = {
      ...out.auswirkungen,
      beschreibung: safeString(ai.auswirkungen.beschreibung, 1200),
      betroffeneDienste: safeString(ai.auswirkungen.betroffeneDienste, 240),
      finanziellauswirkung: safeString(ai.auswirkungen.finanziellauswirkung, 240),
      datenBetroffen: safeBool(ai.auswirkungen.datenBetroffen),
      personenBetroffen: safeBool(ai.auswirkungen.personenBetroffen),
    };
  }

  if (ai.massnahmen) {
    out.massnahmen = {
      ...out.massnahmen,
      sofortmassnahmen: safeStringArray(ai.massnahmen.sofortmassnahmen, 8, 240),
      statusEindaemmung: safeString(ai.massnahmen.statusEindaemmung, 240),
    };
  }

  if (ai.rechtsgrundlage) {
    const paragraphs = safeStringArray(ai.rechtsgrundlage.paragraphen, 10, 64);
    out.rechtsgrundlage = {
      ...out.rechtsgrundlage,
      paragraphen: paragraphs.length ? paragraphs : out.rechtsgrundlage.paragraphen,
      rahmenwerk: safeString(ai.rechtsgrundlage.rahmenwerk, 40) || out.rechtsgrundlage.rahmenwerk,
      meldepflichtBegruendung: safeString(ai.rechtsgrundlage.meldepflichtBegruendung, 800),
    };
  }

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    const alertId = (body.alertId || "").trim();
    if (!alertId) {
      return NextResponse.json({ error: "Missing alertId" }, { status: 400 });
    }

    const phase: MeldungPhase = body.phase || "erstmeldung";
    const kenntnisnahmeDate = body.kenntnisnahme ? new Date(body.kenntnisnahme) : new Date();
    const kenntnisnahme = Number.isNaN(kenntnisnahmeDate.getTime()) ? new Date() : kenntnisnahmeDate;

    const alert = await getAlertById(alertId);
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const deadlines = calculateDeadlines(kenntnisnahme);

    const nis2Refs = alert.compliance?.nis2?.references || [];
    const paragraphs = Array.from(new Set(["§32 BSIG", ...nis2Refs])).slice(0, 8);

    const baseDraft: MeldungDraft = {
      id: randomUUID(),
      alertId: alert.id,
      createdAt: new Date().toISOString(),
      phase,
      kontakt: {
        organisation: placeholder("Organisation / Unternehmen"),
        ansprechpartner: placeholder("Kontaktperson"),
        telefon: placeholder("Telefon"),
        email: placeholder("E-Mail"),
        rolle: placeholder("Rolle"),
      },
      vorfall: {
        einstufung: "sicherheitsvorfall",
        meldegrund: "",
        zeitpunktEntdeckung: kenntnisnahme.toISOString(),
        zeitpunktEintritt: "unbekannt",
        beschreibung: "",
        lageeinschaetzung: "",
      },
      technik: {
        betroffeneSysteme: (alert.affectedProducts || []).slice(0, 30),
        betroffeneVersionen: (alert.affectedVersions || []).slice(0, 30),
        hersteller: (alert.affectedVendors || []).slice(0, 20),
        cveIds: (alert.cveIds || []).slice(0, 60),
        cvssScore: alert.cvssScore ?? null,
        epssScore: alert.epssScore ?? null,
        angriffsvektor: "unbekannt",
        iocs: [],
        istAktivAusgenutzt: Boolean(alert.isActivelyExploited),
        istZeroDay: Boolean(alert.isZeroDay),
      },
      auswirkungen: {
        beschreibung: "",
        betroffeneDienste: "",
        finanziellauswirkung: "",
        datenBetroffen: null,
        personenBetroffen: null,
      },
      massnahmen: {
        sofortmassnahmen: alert.compliance?.nis2?.actionItemsDe?.slice(0, 5) || [],
        statusEindaemmung: "",
      },
      rechtsgrundlage: {
        paragraphen: paragraphs,
        rahmenwerk: "BSIG/NIS2",
        meldepflichtBegruendung: alert.compliance?.nis2?.reasoning || "",
      },
      fristen: {
        kenntnisnahme: kenntnisnahme.toISOString(),
        erstmeldungDeadline: deadlines.erstmeldung.toISOString(),
        meldungDeadline: deadlines.meldung.toISOString(),
        abschlussDeadline: deadlines.abschluss.toISOString(),
      },
      bsiLinks: {
        meldung: BSI_LINKS.mipMeldung,
        info: BSI_LINKS.bsiNis2Info,
      },
    };

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_MODEL || "gpt-4o",
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(alert, phase, kenntnisnahme.toISOString()) },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    let aiParts: AiDraftParts | null = null;
    try {
      const cleaned = stripJsonFences(content);
      aiParts = JSON.parse(cleaned) as AiDraftParts;
    } catch (e) {
      console.warn("Failed to parse meldung draft AI JSON:", e);
      aiParts = null;
    }

    const draft = mergeAiParts(baseDraft, aiParts);

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("meldung-draft API error:", message);
    return NextResponse.json({ error: "Draft konnte nicht erstellt werden" }, { status: 500 });
  }
}

function placeholder(labelDe: string): string {
  return `<${labelDe} - bitte ausfüllen>`;
}


