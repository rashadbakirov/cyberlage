// © 2025 CyberLage
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";
import { t, type Locale } from "@/lib/translations";

export interface AlertSummaryRow {
  id: string;
  title: string;
  titleDe: string | null;
  severity: string | null;
  aiScore: number | null;
  publishedAt: string;
}

export default function AlertList({
  title,
  alerts,
  lang = "en",
  footerHref,
  footerLabel,
}: {
  title: string;
  alerts: AlertSummaryRow[];
  lang?: Locale;
  footerHref?: string;
  footerLabel?: string;
}) {
  const footerText = footerLabel ?? `${t("show_all", lang)} →`;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <span className="text-xs text-text-muted">{t("sorted_by", lang)}: Score</span>
      </div>

      <div className="divide-y divide-slate-200">
        {alerts.map(alert => (
          <Link
            key={alert.id}
            href={`/meldung/${alert.id}`}
            className="block py-3 hover:bg-hover transition px-2 rounded-lg"
          >
            <div className="grid grid-cols-[56px_64px_1fr_auto] gap-3 items-center">
              <div className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                {typeof alert.aiScore === "number" ? alert.aiScore : "—"}
              </div>
              <div>
                <Badge severity={alert.severity} compact lang={lang} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-text-primary font-medium truncate">
                  {alert.title || alert.titleDe}
                </p>
              </div>
              <div className="text-xs text-text-muted">
                {timeAgo(alert.publishedAt, lang)}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {footerHref && (
        <div className="pt-4">
          <Link href={footerHref} className="text-sm text-primary-700 hover:text-primary-800">
            {footerText}
          </Link>
        </div>
      )}
    </Card>
  );
}


