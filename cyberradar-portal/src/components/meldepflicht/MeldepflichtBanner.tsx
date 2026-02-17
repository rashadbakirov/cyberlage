// © 2025 CyberLage
"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, Flame } from "lucide-react";
import { BSI_LINKS, getMeldepflichtSeverity } from "@/lib/meldepflicht";
import type { Locale } from "@/lib/translations";
import type { Alert } from "@/types/alert";

type Props = {
  alert: Alert;
  lang: Locale;
};

export default function MeldepflichtBanner({ alert, lang }: Props) {
  const urgency = getMeldepflichtSeverity(alert);
  const isGerman = lang === "de";

  const urgencyClass =
    urgency === "kritisch"
      ? "bg-red-100 text-red-800 border border-red-200"
      : urgency === "hoch"
        ? "bg-orange-100 text-orange-800 border border-orange-200"
        : "bg-yellow-100 text-yellow-800 border border-yellow-200";

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-700" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-amber-900">
            {isGerman ? "⚠️ Mögliche NIS2-Meldepflicht" : "⚠️ Possible NIS2 reporting obligation"}
          </h3>
          <p className="text-sm text-amber-800 mt-1 leading-relaxed">
            {isGerman
              ? "Diese Meldung kann bei Betroffenheit eine Meldepflicht nach §30 Abs. 1 Nr. 5 BSIG auslösen. Erhebliche Sicherheitsvorfälle sollten innerhalb von 24 Stunden an das BSI gemeldet werden (Frühwarnung)."
              : "This alert may trigger a reporting obligation under German NIS2 law if your organization is affected. Significant incidents should be reported within 24 hours."}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${urgencyClass}`}>
              {isGerman ? `Dringlichkeit: ${urgency}` : `Urgency: ${urgency}`}
            </span>
            {alert.isActivelyExploited && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                <Flame className="inline-block w-3.5 h-3.5 mr-1" />
                {isGerman ? "Aktiv ausgenutzt" : "Actively exploited"}
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {isGerman ? "24h Meldefrist" : "24h deadline"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/meldepflicht?alertId=${encodeURIComponent(alert.id)}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
        >
          {isGerman ? "Betrifft uns — Meldung vorbereiten" : "Affects us — Prepare report"}
        </Link>

        <a
          href={BSI_LINKS.mipMeldung}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-amber-300 text-amber-900 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
        >
          {isGerman ? "Direkt zum BSI-Portal" : "Open BSI portal"}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

