// © 2025 CyberLage
import Card from "@/components/ui/Card";
import type { ComplianceTag } from "@/types/alert";
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/translations";

function relevanceLabel(relevant: ComplianceTag["relevant"], lang: Locale): { label: string; className: string } {
  if (relevant === "yes") {
    return {
      label: t("compliance_relevant", lang),
      className: "text-red-700 bg-red-50 border border-red-200",
    };
  }
  if (relevant === "conditional") {
    return {
      label: t("compliance_conditional", lang),
      className: "text-amber-700 bg-amber-50 border border-amber-200",
    };
  }
  return {
    label: t("compliance_not_relevant", lang),
    className: "text-gray-600 bg-gray-50 border border-gray-200",
  };
}

export default function ComplianceCard({
  title,
  data,
  lang = "de",
}: {
  title: string;
  data: ComplianceTag;
  lang?: Locale;
}) {
  const rel = relevanceLabel(data.relevant, lang);
  return (
    <Card className="p-0 overflow-hidden">
      <details className="group">
        <summary className="list-none cursor-pointer p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-text-primary">{title}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", rel.className)}>{rel.label}</span>
              <span className="text-xs text-text-muted">
                {t("label_confidence", lang)}: {data.confidence}
              </span>
              {data.reportingRequired && (
                <span className="text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">
                  ⚠️ {t("label_reporting_required", lang)}
                </span>
              )}
            </div>
            {data.references && data.references.length > 0 && (
              <p className="text-xs text-text-muted mt-1 truncate">
                {t("label_references", lang)}: {data.references.slice(0, 4).join(", ")}
                {data.references.length > 4 ? ` +${data.references.length - 4}` : ""}
              </p>
            )}
          </div>
          <span className="text-text-muted group-open:rotate-180 transition">▾</span>
        </summary>

        <div className="px-5 pb-5 pt-0 border-t border-slate-200">
          <p className="text-sm text-text-secondary mt-4 whitespace-pre-wrap">{data.reasoning}</p>

          {data.reportingRequired && (
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
              <p className="font-semibold">{t("label_check_reporting", lang)}</p>
              <p className="mt-1 text-xs">
                {t("label_deadline_hours", lang)}: {data.reportingDeadlineHours ?? "—"}
              </p>
            </div>
          )}

          {data.actionItemsDe && data.actionItemsDe.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-text-primary mb-2">{t("label_action_items", lang)}</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-text-secondary">
                {data.actionItemsDe.slice(0, 4).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}


