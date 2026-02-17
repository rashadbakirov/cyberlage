// © 2025 CyberLage
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Loading from "@/components/ui/Loading";
import TimeRangeSelector from "@/components/layout/TimeRangeSelector";
import { useAppShell } from "@/components/layout/AppShell";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { t } from "@/lib/translations";
import type { ComplianceTag, PortalStatsResponse } from "@/types/alert";

type Framework = "nis2" | "dora" | "gdpr";

type StatsApiResponse = PortalStatsResponse & {
  timeRange: { start: string; end: string; days: number | null; labelDe: string; labelEn: string };
};

type AlertSummary = {
  id: string;
  title: string;
  titleDe: string | null;
  severity: string | null;
  aiScore: number | null;
  publishedAt: string;
  complianceTags: {
    nis2: ComplianceTag | null;
    dora: ComplianceTag | null;
    gdpr: ComplianceTag | null;
  };
};

type AlertsApiResponse = {
  alerts: AlertSummary[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  timeRange: { start: string; end: string; days: number | null; labelDe: string; labelEn: string };
};


const FRAMEWORKS: Array<{ id: Framework; label: string }> = [
  { id: "nis2", label: "NIS2" },
  { id: "dora", label: "DORA" },
  { id: "gdpr", label: "DSGVO" },
];

export default function ComplianceClient() {
  const router = useRouter();
  const pathname = usePathname() || "/compliance";
  const params = useSearchParams();
  const { lang } = useAppShell();

  const framework = ((params.get("framework") || "nis2").toLowerCase() as Framework) || "nis2";
  const days = params.get("days") || "0";
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const [stats, setStats] = useState<StatsApiResponse | null>(null);
  const [reporting, setReporting] = useState<AlertsApiResponse | null>(null);
  const [relevant, setRelevant] = useState<AlertsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  function setQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const qp = new URLSearchParams();
        if (startDate) qp.set("startDate", startDate);
        if (endDate) qp.set("endDate", endDate);
        if (!startDate && !endDate) qp.set("days", days);

        const statsRes = await fetch(`/api/stats?${qp.toString()}`, { cache: "no-store" });
        const statsJson = (await statsRes.json()) as StatsApiResponse;

        if (!cancelled) {
          setStats(statsJson);
        }

        const reportingQp = new URLSearchParams(qp.toString());
        reportingQp.set("page", "1");
        reportingQp.set("pageSize", "25");
        reportingQp.set("sortBy", "score");
        reportingQp.set("compliance", framework);
        reportingQp.set("reportingOnly", "true");

        const relevantQp = new URLSearchParams(qp.toString());
        relevantQp.set("page", "1");
        relevantQp.set("pageSize", "50");
        relevantQp.set("sortBy", "score");
        relevantQp.set("compliance", framework);

        const [repRes, relRes] = await Promise.all([
          fetch(`/api/alerts?${reportingQp.toString()}`, { cache: "no-store" }),
          fetch(`/api/alerts?${relevantQp.toString()}`, { cache: "no-store" }),
        ]);

        const repJson = (await repRes.json()) as AlertsApiResponse;
        const relJson = (await relRes.json()) as AlertsApiResponse;
        if (!cancelled) {
          setReporting(repJson);
          setRelevant(relJson);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setStats(null);
          setReporting(null);
          setRelevant(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [framework, days, startDate, endDate]);

  const counts = stats?.compliance?.[framework] || { yes: 0, conditional: 0, reportingRequired: 0 };
  const rangeLabel = stats?.timeRange?.labelDe;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("compliance_title", lang)}</h1>
          <p className="text-text-secondary mt-1">
            {t("compliance_subtitle", lang)}
            {rangeLabel ? ` — ${rangeLabel}` : ""}
          </p>
        </div>
        <TimeRangeSelector />
      </div>

      <div className="flex flex-wrap gap-2">
        {FRAMEWORKS.map(f => {
          const active = f.id === framework;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setQuery({ framework: f.id })}
              className={cn(
                "h-10 px-4 rounded-lg border text-sm transition",
                active
                  ? "bg-primary-50 border-primary-100 text-primary-900"
                  : "bg-card border-slate-200 text-text-secondary hover:bg-hover"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading && <Loading text={t("loading_compliance", lang)} />}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs text-text-muted uppercase tracking-wider">{t("compliance_reporting", lang)}</p>
              <p className="text-3xl font-bold text-text-primary mt-1 tabular-nums">{counts.reportingRequired}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-text-muted uppercase tracking-wider">{t("compliance_relevant", lang)}</p>
              <p className="text-3xl font-bold text-text-primary mt-1 tabular-nums">{counts.yes}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-text-muted uppercase tracking-wider">{t("compliance_conditional", lang)}</p>
              <p className="text-3xl font-bold text-text-primary mt-1 tabular-nums">{counts.conditional}</p>
            </Card>
          </div>

          <>
            <Section
              title={t("compliance_reporting_incidents", lang)}
              subtitle={t("compliance_reporting_hint", lang)}
              emptyText={t("compliance_empty_reporting", lang)}
              items={reporting?.alerts || []}
              framework={framework}
              lang={lang}
              rangeDays={reporting?.timeRange?.days ?? null}
            />

            <Section
              title={t("compliance_relevant_alerts", lang)}
              subtitle={t("compliance_relevant_hint", lang)}
              emptyText={t("compliance_empty_relevant", lang)}
              items={relevant?.alerts || []}
              framework={framework}
              lang={lang}
              rangeDays={relevant?.timeRange?.days ?? null}
            />
          </>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  emptyText,
  items,
  framework,
  lang,
  rangeDays,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  items: AlertSummary[];
  framework: Framework;
  lang: "de";
  rangeDays: number | null;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-xs text-text-muted">{subtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-6">
          <p className="text-sm text-text-secondary">{emptyText}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {items.map((a, idx) => {
            const tag = a.complianceTags?.[framework];
            const refs = tag?.references?.slice(0, 3) || [];
            return (
              <Link
                key={a.id}
                href={`/meldung/${a.id}`}
                className={cn("block px-5 py-4 hover:bg-hover transition", idx % 2 === 0 ? "bg-card" : "bg-slate-50/40")}
              >
                <div className="grid grid-cols-[72px_96px_1fr_260px_120px] gap-3 items-center">
                  <div className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                    {typeof a.aiScore === "number" ? a.aiScore : "—"}
                  </div>
                  <div>
                    <Badge severity={a.severity} compact lang={lang} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{a.titleDe || a.title}</p>
                    {tag?.reasoning && <p className="text-xs text-text-secondary truncate">{tag.reasoning}</p>}
                  </div>
                  <div className="text-xs text-text-muted truncate">{refs.length ? refs.join(", ") : "—"}</div>
                  <div className="text-xs text-text-muted">
                    {rangeDays === 0 ? timeAgo(a.publishedAt, lang) : formatDate(a.publishedAt, lang)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}


