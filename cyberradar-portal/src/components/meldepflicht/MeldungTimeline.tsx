// © 2025 CyberLage
"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { parseIsoDate } from "@/lib/utils";
import type { Locale } from "@/lib/translations";

type Props = {
  lang: Locale;
  kenntnisnahme: string;
  erstmeldung: string;
  meldung: string;
  abschluss: string;
};

function formatDeadline(date: Date, _lang: Locale): string {
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(target: Date, now: Date, _lang: Locale): { text: string; overdue: boolean } {
  const diffMs = target.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const totalMin = Math.floor(abs / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}T`);
  if (hours) parts.push(`${hours}Std.`);
  if (!days && !hours) parts.push(`${minutes}Min.`);

  const prefix = overdue ? "überfällig" : "in";
  const joined = parts.join(" ");
  return { text: overdue ? `${prefix} ${joined}` : `${prefix} ${joined}`, overdue };
}

export default function MeldungTimeline({ lang, kenntnisnahme, erstmeldung, meldung, abschluss }: Props) {
  const kenntnisnahmeDate = useMemo(() => parseIsoDate(kenntnisnahme) || new Date(), [kenntnisnahme]);
  const erstmeldungDate = useMemo(() => parseIsoDate(erstmeldung) || new Date(), [erstmeldung]);
  const meldungDate = useMemo(() => parseIsoDate(meldung) || new Date(), [meldung]);
  const abschlussDate = useMemo(() => parseIsoDate(abschluss) || new Date(), [abschluss]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs text-text-muted">Kenntnisnahme</p>
        <p className="text-sm font-semibold text-text-primary mt-1">{formatDeadline(kenntnisnahmeDate, lang)}</p>
      </div>

      <Row
        lang={lang}
        badge="24h"
        badgeClass="bg-red-100 text-red-700"
        title="Frühe Erstmeldung"
        target={erstmeldungDate}
        now={now}
      />
      <Row
        lang={lang}
        badge="72h"
        badgeClass="bg-orange-100 text-orange-700"
        title="Meldung"
        target={meldungDate}
        now={now}
      />
      <Row
        lang={lang}
        badge="30d"
        badgeClass="bg-blue-100 text-blue-700"
        title="Abschluss"
        target={abschlussDate}
        now={now}
      />

      <p className="text-xs text-text-muted leading-relaxed">
        <Clock className="w-3.5 h-3.5 inline-block mr-1" />
        Fristen gemäß §32 BSIG. Bitte prüfen, ob eine Meldung tatsächlich erforderlich ist.
      </p>
    </div>
  );
}

function Row({
  lang,
  badge,
  badgeClass,
  title,
  target,
  now,
}: {
  lang: Locale;
  badge: string;
  badgeClass: string;
  title: string;
  target: Date;
  now: Date;
}) {
  const countdown = formatCountdown(target, now, lang);
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${badgeClass}`}>
        <span className="text-xs font-bold">{badge}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary mt-0.5">
          {target.toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}{" "}
          <span className={countdown.overdue ? "text-red-600 font-semibold" : "text-text-muted"}>
            · {countdown.text}
          </span>
        </p>
      </div>
    </div>
  );
}


