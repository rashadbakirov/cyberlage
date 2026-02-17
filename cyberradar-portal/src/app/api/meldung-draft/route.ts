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

const SYSTEM_PROMPT = `You are an incident-response and NIS2/BSIG compliance assistant.

Task: Create a **draft** for a report to BSI (MIP). This draft is for preparation only; no automatic submission.

IMPORTANT RULES:
1) Use only the provided alert data. Do not invent facts (no IOCs, timestamps, or damages) if not present.
2) If something is unknown, write "unknown" or leave the field empty (""), but still return valid JSON.
3) Write in concise, professional English suitable for CISO/IR teams.
4) Return **JSON only** (no Markdown, no explanations).`;

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
  const actionItems = (nis2?.actionItemsEn || nis2?.actionItemsDe || []).slice(0, 6);

  return `PHASE: ${phase}
AWARENESS TIME (ISO): ${kenntnisnahmeIso}

ALERT:
Title: ${alert.title || alert.titleDe}
Source: ${alert.sourceName || alert.sourceId}
Published: ${alert.publishedAt || alert.fetchedAt}
Severity: ${alert.severity || "unknown"}
AI Score: ${typeof alert.aiScore === "number" ? alert.aiScore : "—"}
Actively exploited: ${alert.isActivelyExploited ? "YES" : "No"}
Zero-day: ${alert.isZeroDay ? "YES" : "No"}

Description/Summary:
${(alert.summary || alert.summaryDe || alert.description || "").trim()}

Technical data:
CVEs: ${(alert.cveIds || []).slice(0, 30).join(", ") || "None"}
CVSS: ${alert.cvssScore ?? "—"}
EPSS: ${alert.epssScore ?? "—"}
Affected products: ${(alert.affectedProducts || []).slice(0, 20).join(", ") || "unknown"}
Affected versions: ${(alert.affectedVersions || []).slice(0, 20).join(", ") || "unknown"}
Vendors: ${(alert.affectedVendors || []).slice(0, 20).join(", ") || "unknown"}

NIS2/BSIG (if available):
Relevant: ${nis2?.relevant || "unknown"}
ReportingRequired: ${nis2?.reportingRequired ? "true" : "false"}
References: ${nis2Refs.join(", ") || "—"}
Reasoning: ${nis2?.reasoning || "—"}
Recommended actions: ${actionItems.join(" | ") || "—"}

Return one JSON object with exactly these fields:
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

Notes:
- zeitpunktEntdeckung may default to awareness time if unknown.
- Include IOCs only when present in the data; otherwise use [].
- sofortmassnahmen: provide 2-5 concrete items, ideally including product name/CVE when available.`;
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
        organisation: placeholder("Organization / Company"),
        ansprechpartner: placeholder("Contact person"),
        telefon: placeholder("Phone"),
        email: placeholder("Email"),
        rolle: placeholder("Role"),
      },
      vorfall: {
        einstufung: "sicherheitsvorfall",
        meldegrund: "",
        zeitpunktEntdeckung: kenntnisnahme.toISOString(),
        zeitpunktEintritt: "unknown",
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
        angriffsvektor: "unknown",
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
        sofortmassnahmen: alert.compliance?.nis2?.actionItemsEn?.slice(0, 5) || alert.compliance?.nis2?.actionItemsDe?.slice(0, 5) || [],
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
      console.warn("Failed to parse report draft AI JSON:", e);
      aiParts = null;
    }

    const draft = mergeAiParts(baseDraft, aiParts);

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("meldung-draft API error:", message);
    return NextResponse.json({ error: "Draft could not be created" }, { status: 500 });
  }
}

function placeholder(labelDe: string): string {
  return `<${labelDe} - please fill in>`;
}



