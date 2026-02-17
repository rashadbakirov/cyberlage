// © 2025 CyberLage
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { Alert } from "@/types/alert";
import { truncate } from "@/lib/utils";
import { t, type Locale } from "@/lib/translations";

function pickTopAction(alert: Alert): string | null {
  const lists = [
    alert.compliance?.nis2?.actionItemsDe,
    alert.compliance?.dora?.actionItemsDe,
    alert.compliance?.gdpr?.actionItemsDe,
  ].filter(Boolean) as string[][];

  for (const items of lists) {
    const first = items?.[0];
    if (first && first.trim()) return first.trim();
  }
  return null;
}

export default function UrgentAlerts({ alerts, lang = "de" }: { alerts: Alert[]; lang?: Locale }) {
  return (
    <Card className="p-5 border-red-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("immediate_action", lang)}
        </h2>
        <span className="text-xs text-text-muted">
          Top {Math.min(alerts.length, 5)}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {t("urgent_empty", lang)}
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 5).map(alert => {
            const action = pickTopAction(alert);
            const title = alert.titleDe || alert.title;
            return (
              <Link
                key={alert.id}
                href={`/meldung/${alert.id}`}
                className="block rounded-lg border border-slate-200 bg-card hover:bg-hover transition p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge severity={alert.severity} compact lang={lang} />
                      {typeof alert.aiScore === "number" && (
                        <span className="text-xs font-mono font-semibold text-text-secondary">
                          {alert.aiScore}
                        </span>
                      )}
                      {alert.epssScore !== null && alert.epssScore !== undefined && alert.epssScore > 0 && (
                        <span className="text-xs text-text-muted">
                          EPSS {(alert.epssScore * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-text-primary line-clamp-1">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary line-clamp-1">
                      {action
                        ? truncate(action, 140)
                        : truncate(alert.summaryDe || alert.summary || alert.description, 140)}
                    </p>
                  </div>
                  <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 flex-shrink-0">
                    {t("urgent_tag", lang)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}


