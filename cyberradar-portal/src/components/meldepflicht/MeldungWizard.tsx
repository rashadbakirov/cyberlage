// © 2025 CyberLage
"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileDown, Loader2, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import MeldungTimeline from "@/components/meldepflicht/MeldungTimeline";
import MeldungDraftView from "@/components/meldepflicht/MeldungDraftView";
import MeldungPdfExport from "@/components/meldepflicht/MeldungPdfExport";
import { BSI_LINKS, calculateDeadlines, type MeldungDraft, type MeldungPhase } from "@/lib/meldepflicht";
import type { Locale } from "@/lib/translations";
import { cn, formatDateTime } from "@/lib/utils";
import type { Alert } from "@/types/alert";

type Props = {
  alert: Alert;
  lang: Locale;
};

function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default function MeldungWizard({ alert, lang }: Props) {
  const [phase, setPhase] = useState<MeldungPhase>("erstmeldung");
  const [kenntnisnahmeLocal, setKenntnisnahmeLocal] = useState(() => toDateTimeLocalValue(new Date()));
  const kenntnisnahmeDate = useMemo(() => parseDateTimeLocal(kenntnisnahmeLocal) || new Date(), [kenntnisnahmeLocal]);

  const [draft, setDraft] = useState<MeldungDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlines = useMemo(() => calculateDeadlines(kenntnisnahmeDate), [kenntnisnahmeDate]);

  const effectiveDraft = useMemo(() => {
    if (!draft) return null;
    return {
      ...draft,
      fristen: {
        kenntnisnahme: kenntnisnahmeDate.toISOString(),
        erstmeldungDeadline: deadlines.erstmeldung.toISOString(),
        meldungDeadline: deadlines.meldung.toISOString(),
        abschlussDeadline: deadlines.abschluss.toISOString(),
      },
    };
  }, [draft, kenntnisnahmeDate, deadlines.erstmeldung, deadlines.meldung, deadlines.abschluss]);

  async function generateDraft() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/meldung-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: alert.id,
          phase,
          kenntnisnahme: kenntnisnahmeDate.toISOString(),
        }),
      });

      const json = (await res.json()) as { draft?: MeldungDraft; error?: string };
      if (!res.ok || !json.draft) {
        throw new Error(json.error || "Draft generation failed");
      }

      setDraft(json.draft);
    } catch (e) {
      console.error(e);
      setDraft(null);
      setError(lang === "de" ? "Entwurf konnte nicht generiert werden." : "Could not generate draft.");
    } finally {
      setGenerating(false);
    }
  }

  const title = lang === "de" ? (alert.titleDe || alert.title) : alert.title;
  const published = formatDateTime(alert.publishedAt || alert.fetchedAt, lang);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wider">
              {lang === "de" ? "Ausgewählte Meldung" : "Selected alert"}
            </p>
            <p className="text-lg font-semibold text-text-primary mt-1 truncate">{title}</p>
            <p className="text-sm text-text-secondary mt-1">
              {alert.sourceName || alert.sourceId} · {published}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={BSI_LINKS.mip}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 rounded-lg border border-slate-200 bg-card text-sm text-text-secondary hover:bg-hover transition inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {lang === "de" ? "BSI MIP öffnen" : "Open BSI MIP"}
            </a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-text-muted mb-1">{lang === "de" ? "Phase" : "Phase"}</p>
            <select
              value={phase}
              onChange={e => setPhase(e.target.value as MeldungPhase)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-card px-3 text-sm text-text-secondary"
            >
              <option value="erstmeldung">{lang === "de" ? "Erstmeldung (24h)" : "Early report (24h)"}</option>
              <option value="meldung">{lang === "de" ? "Meldung (72h)" : "Full report (72h)"}</option>
              <option value="abschluss">{lang === "de" ? "Abschluss (30d)" : "Final report (30d)"}</option>
            </select>
          </div>

          <div>
            <p className="text-xs text-text-muted mb-1">{lang === "de" ? "Kenntnisnahme" : "Awareness time"}</p>
            <input
              type="datetime-local"
              value={kenntnisnahmeLocal}
              onChange={e => setKenntnisnahmeLocal(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-card px-3 text-sm text-text-secondary"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={generateDraft}
              disabled={generating}
              className={cn(
                "h-10 px-4 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2",
                generating
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-primary-800 text-white hover:bg-primary-700"
              )}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === "de" ? "Erstelle Entwurf…" : "Generating…"}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {lang === "de" ? "KI-Entwurf generieren" : "Generate AI draft"}
                </>
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            {lang === "de" ? "Fristen" : "Deadlines"}
          </h2>
          <MeldungTimeline
            lang={lang}
            kenntnisnahme={kenntnisnahmeDate.toISOString()}
            erstmeldung={deadlines.erstmeldung.toISOString()}
            meldung={deadlines.meldung.toISOString()}
            abschluss={deadlines.abschluss.toISOString()}
          />
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              {lang === "de" ? "Entwurf" : "Draft"}
            </h2>
            <div className="flex items-center gap-2">
              {effectiveDraft ? <MeldungPdfExport draft={effectiveDraft} lang={lang} /> : null}
              {effectiveDraft ? (
                <a
                  href={BSI_LINKS.mip}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-card text-xs text-text-secondary hover:bg-hover transition inline-flex items-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {lang === "de" ? "BSI öffnen" : "Open BSI"}
                </a>
              ) : null}
              {effectiveDraft ? (
                <a
                  href={BSI_LINKS.mipMeldung}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-card text-xs text-text-secondary hover:bg-hover transition inline-flex items-center gap-2"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {lang === "de" ? "Formular" : "Form"}
                </a>
              ) : null}
            </div>
          </div>

          {!effectiveDraft ? (
            <div className="py-10 text-center">
              <Loader2 className={cn("w-8 h-8 mx-auto text-primary-700", generating ? "animate-spin" : "")} />
              <p className="text-sm text-text-secondary mt-3">
                {generating
                  ? lang === "de"
                    ? "Entwurf wird erstellt…"
                    : "Draft is being created…"
                  : lang === "de"
                    ? "Klicken Sie auf „KI-Entwurf generieren“, um einen BSI-Meldeentwurf zu erstellen."
                    : "Click “Generate AI draft” to create a BSI report draft."}
              </p>
              <p className="text-xs text-text-muted mt-2">
                {lang === "de"
                  ? "Hinweis: CyberLage sendet keine Meldungen an das BSI. Bitte prüfen und ergänzen."
                  : "Note: CyberLage does not submit to the BSI. Please review and complete."}
              </p>
            </div>
          ) : (
            <MeldungDraftView alert={alert} draft={effectiveDraft} lang={lang} />
          )}
        </Card>
      </div>
    </div>
  );
}
