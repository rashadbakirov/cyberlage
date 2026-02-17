// © 2025 CyberLage
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppShell } from "@/components/layout/AppShell";
import { calculateDailyThreat } from "@/lib/threatScore";
import { t, type Locale } from "@/lib/translations";
import { TOPICS, categorizeAlert } from "@/lib/topics";
import { cn } from "@/lib/utils";
import ThreatScoreBanner from "@/components/dashboard/ThreatScoreBanner";
import TrendSparkline from "@/components/dashboard/TrendSparkline";
import ComplianceStrip from "@/components/dashboard/ComplianceStrip";
import TimeRangeSelector from "@/components/layout/TimeRangeSelector";
import Loading from "@/components/ui/Loading";
import type { PortalStatsResponse } from "@/types/alert";
import type { AlertStatusValue } from "@/lib/audit";

type StatsApiResponse = PortalStatsResponse & {
  timeRange: { start: string; end: string; days: number | null; labelDe: string; labelEn: string };
  dailyCounts?: Array<{ date: string; total: number; critical: number }>;
  trend?: {
    previousPeriodTotal: number;
    changePercent: number;
    previousPeriodBySeverity?: PortalStatsResponse["bySeverity"];
  };
};

type AlertDetail = {
  id: string;
  title: string;
  titleDe: string | null;
  severity: string | null;
  aiScore: number | null;
  sourceName?: string | null;
  alertType?: string | null;
  publishedAt: string;
  isActivelyExploited?: boolean;
  isZeroDay?: boolean;
  topics?: string[];
};

type AlertsApiResponse = {
  alerts: AlertDetail[];
  total: number;
};


function severityShortLabel(severity: string | null, lang: Locale): string {
  switch (severity) {
    case "critical":
      return t("sev_critical_short", lang);
    case "high":
      return t("sev_high_short", lang);
    case "medium":
      return t("sev_medium_short", lang);
    case "low":
      return t("sev_low_short", lang);
    case "info":
      return t("sev_info_short", lang);
    default:
      return "—";
  }
}

function severityFullLabel(severity: string | null, lang: Locale): string {
  switch (severity) {
    case "critical":
      return t("sev_critical", lang);
    case "high":
      return t("sev_high", lang);
    case "medium":
      return t("sev_medium", lang);
    case "low":
      return t("sev_low", lang);
    case "info":
      return t("sev_info", lang);
    default:
      return "—";
  }
}

function AlertRow({
  alert,
  lang,
  highlighted,
  topicMetaById,
  alertStatus,
  href,
}: {
  alert: AlertDetail;
  lang: Locale;
  highlighted?: boolean;
  topicMetaById?: Record<string, { label: string; icon?: string }>;
  alertStatus?: AlertStatusValue;
  href?: string;
}) {
  const firstTopic = alert.topics?.[0] || null;
  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    info: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const severityLabel = severityShortLabel(alert.severity, lang);
  const statusDot: Record<AlertStatusValue, string> = {
    new: "bg-gray-300",
    acknowledged: "bg-blue-400",
    in_progress: "bg-amber-400",
    resolved: "bg-green-400",
    dismissed: "bg-gray-200",
  };

  const timeAgo = useMemo(() => {
    const now = new Date();
    const pub = new Date(alert.publishedAt);
    const diffHours = Math.floor((now.getTime() - pub.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) {
      return t('time_ago_hours', lang, { n: diffHours });
    }
    const diffDays = Math.floor(diffHours / 24);
    return t('time_ago_days', lang, { n: diffDays });
  }, [alert.publishedAt, lang]);

  const displayTitle = alert.titleDe || alert.title;
  const topicLabel = firstTopic ? topicMetaById?.[firstTopic]?.label || firstTopic : "-";

  return (
    <Link
      href={href || `/meldung/${alert.id}`}
      className={`block px-6 py-3 hover:bg-gray-50 transition-colors ${highlighted ? 'bg-red-50/30' : ''}`}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        <div className="col-span-1 flex items-center justify-center gap-2">
          <span
            className={cn("w-2 h-2 rounded-full", statusDot[alertStatus || "new"] || statusDot.new)}
            title={alertStatus || "new"}
          />
          <span className="text-lg font-bold font-mono text-gray-900">
            {alert.aiScore || 0}
          </span>
        </div>
        <div className="col-span-1 flex justify-center">
          <span className={`px-2 py-1 rounded text-xs font-semibold border ${severityColors[alert.severity as keyof typeof severityColors] || severityColors.info}`}>
            {severityLabel}
          </span>
        </div>
        <div className="col-span-7 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{displayTitle}</p>
        </div>
        <div className="col-span-2 hidden lg:block">
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            {topicLabel}
          </span>
        </div>
        <div className="col-span-1 text-right text-xs text-gray-500">
          {timeAgo}
        </div>
      </div>
    </Link>
  );
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (!Number.isFinite(previous) || previous === 0 || current === previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const isUp = current > previous;
  return (
    <span className={`text-xs font-medium ${isUp ? "text-red-500" : "text-green-600"}`}>
      {isUp ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function toSeverityKey(value: string | null | undefined): keyof PortalStatsResponse["bySeverity"] {
  const normalized = String(value || "info").toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") {
    return normalized;
  }
  return "info";
}

export default function DashboardClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useAppShell();

  const daysParam = params.get("days");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const topicParam = params.get("topic");
  const severityParam = params.get("severity");
  const sourceParam = params.get("source");
  const typeParam = params.get("type");

  const days = daysParam ? Number.parseInt(daysParam, 10) : 0;
  const selectedTopic = topicParam?.toLowerCase() || null;
  const selectedSeverity = severityParam as 'critical' | 'high' | 'medium' | 'low' | null;
  const selectedSource = sourceParam || null;
  const selectedType = typeParam || null;
  const [stats, setStats] = useState<StatsApiResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsApiResponse | null>(null);
  const [statusByAlertId, setStatusByAlertId] = useState<Record<string, AlertStatusValue>>({});
  const [loading, setLoading] = useState(true);

  const topicMetaById = useMemo(() => {
    const map: Record<string, { label: string; icon?: string }> = {
      general: { label: "Allgemein", icon: "🗂️" },
    };
    for (const topic of TOPICS) {
      map[topic.id] = {
        label: topic.label,
        icon: topic.icon,
      };
    }
    return map;
  }, [lang]);

  const selectedTopicLabel = selectedTopic ? topicMetaById[selectedTopic]?.label || selectedTopic : null;
  const selectedTypeLabel = useMemo(() => {
    if (!selectedType) return null;
    const normalized = selectedType.toLowerCase();
    if (normalized.includes("m365-health")) return "M365 Health";
    if (normalized.includes("m365-update") || normalized.includes("m365-roadmap")) return "M365-Updates";
    return selectedType;
  }, [selectedType]);

  const topicIdsToShow = useMemo(() => {
    const base = [...TOPICS.map(t => t.id), "general"];
    const known = new Set(base);

    const extras = Object.keys(stats?.byTopic || {}).filter(id => !known.has(id));
    extras.sort((a, b) => {
      const ac = stats?.byTopic?.[a] ?? 0;
      const bc = stats?.byTopic?.[b] ?? 0;
      return bc - ac || a.localeCompare(b);
    });

    return [...base, ...extras];
  }, [stats]);

  const sourceCountByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stats?.bySource || []) {
      map.set(row.source, row.count);
    }
    return map;
  }, [stats]);

  const microsoftSubCounts = useMemo(() => {
    const security = sourceCountByName.get("Microsoft Security Response Center") || 0;
    const msgCenter = sourceCountByName.get("Microsoft 365 Message Center") || 0;
    const roadmap = sourceCountByName.get("Microsoft 365 Roadmap") || 0;
    const serviceHealth = sourceCountByName.get("Microsoft 365 Service Health") || 0;

    return {
      security,
      m365Updates: msgCenter + roadmap,
      m365Health: serviceHealth,
    };
  }, [sourceCountByName]);

  function setQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    router.push(`/?${next.toString()}`);
  }

  function buildMeldungenLink(): string {
    const qp = new URLSearchParams();
    if (startDate) qp.set("startDate", startDate);
    if (endDate) qp.set("endDate", endDate);
    if (!startDate && !endDate) qp.set("days", String(Number.isFinite(days) ? days : 0));
    if (selectedTopic) qp.set("topic", selectedTopic);
    if (selectedSeverity) qp.set("severity", selectedSeverity);
    if (selectedSource) qp.set("source", selectedSource);
    if (selectedType) qp.set("type", selectedType);
    const query = qp.toString();
    return query ? `/meldungen?${query}` : "/meldungen";
  }

  function setTopic(id: string | null) {
    setQuery({ topic: id, severity: null, source: null, type: null });
  }

  function setSeverity(sev: string | null) {
    setQuery({ severity: sev });
  }

  function clearAllFilters() {
    setQuery({ topic: null, severity: null, source: null, type: null });
  }

  function setMicrosoftSecurity() {
    setQuery({
      topic: "microsoft",
      source: "Microsoft Security Response Center",
      type: null,
    });
  }

  function setMicrosoftM365Updates() {
    setQuery({
      topic: "microsoft",
      type: "m365-update,m365-roadmap",
      source: null,
    });
  }

  function setMicrosoftM365Health() {
    setQuery({
      topic: "microsoft",
      type: "m365-health",
      source: null,
    });
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      let nextAlerts: AlertsApiResponse | null = null;

      try {
        const qp = new URLSearchParams();
        if (startDate) qp.set("startDate", startDate);
        if (endDate) qp.set("endDate", endDate);
        if (!startDate && !endDate) qp.set("days", String(Number.isFinite(days) ? days : 0));

        const statsRes = await fetch(`/api/stats?${qp.toString()}`, { cache: "no-store" });
        if (!statsRes.ok) throw new Error("Statistikabruf fehlgeschlagen");
        const statsJson = (await statsRes.json()) as StatsApiResponse;
        if (!cancelled) setStats(statsJson);

        const alertsQp = new URLSearchParams(qp.toString());
        alertsQp.set("page", "1");
        alertsQp.set("pageSize", "20");
        alertsQp.set("sortBy", "score");
        if (selectedTopic) alertsQp.set("topic", selectedTopic);
        if (selectedSeverity) alertsQp.set("severity", selectedSeverity);
        if (selectedSource) alertsQp.set("source", selectedSource);
        if (selectedType) alertsQp.set("type", selectedType);

        const alertsRes = await fetch(`/api/alerts?${alertsQp.toString()}`, { cache: "no-store" });
        if (!alertsRes.ok) throw new Error("Meldungsabruf fehlgeschlagen");
        const publicAlerts = (await alertsRes.json()) as AlertsApiResponse;

        if (!cancelled) setAlerts(publicAlerts);
        nextAlerts = publicAlerts;

        const ids = nextAlerts?.alerts?.map(a => a.id).filter(Boolean).join(",");
        if (ids) {
          try {
            const statusRes = await fetch(`/api/alert-status?alertIds=${encodeURIComponent(ids)}`, { cache: "no-store" });
            if (statusRes.ok) {
              const statusJson = (await statusRes.json()) as { statuses?: Record<string, { status?: AlertStatusValue }> };
              const next: Record<string, AlertStatusValue> = {};
              for (const [id, s] of Object.entries(statusJson.statuses || {})) {
                next[id] = s?.status || "new";
              }
              if (!cancelled) setStatusByAlertId(next);
            } else if (!cancelled) {
              setStatusByAlertId({});
            }
          } catch (e) {
            console.error(e);
            if (!cancelled) setStatusByAlertId({});
          }
        } else if (!cancelled) {
          setStatusByAlertId({});
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setStats(null);
          setAlerts(null);
          setStatusByAlertId({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [days, startDate, endDate, selectedTopic, selectedSeverity, selectedSource, selectedType, router]);

  const threat = useMemo(() => {
    if (!alerts?.alerts) return null;
    return calculateDailyThreat(alerts.alerts);
  }, [alerts]);

  const urgentAlerts = useMemo(() => {
    if (!alerts?.alerts) return [];
    return alerts.alerts.filter(a => 
      a.isActivelyExploited || (a.aiScore && a.aiScore >= 90) || a.isZeroDay
    );
  }, [alerts]);

  const regularAlerts = useMemo(() => {
    if (!alerts?.alerts) return [];
    const urgentIds = new Set(urgentAlerts.map(a => a.id));
    return alerts.alerts.filter(a => !urgentIds.has(a.id));
  }, [alerts, urgentAlerts]);

  const rangeLabel =
    stats?.timeRange?.labelDe ||
    (days === 0 ? t("time_today", lang) : `${days} Tage`);
  const formattedDate = new Date().toLocaleDateString("de-DE", {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const complianceTimeQuery = useMemo(() => {
    const qp = new URLSearchParams();
    if (startDate) qp.set("startDate", startDate);
    if (endDate) qp.set("endDate", endDate);
    if (!startDate && !endDate) qp.set("days", String(Number.isFinite(days) ? days : 0));
    return qp.toString();
  }, [days, startDate, endDate]);

  return (
    <div className="flex gap-4">
      {/* Left sidebar - Topic Filter */}
      <aside className="hidden md:block w-[260px] bg-gray-50/80 border-r border-gray-200 rounded-lg p-4 h-fit sticky top-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('topics_title', lang)}</h3>
        <div className="space-y-1">
          <button
            onClick={() => setTopic(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedTopic
                ? 'bg-primary-700 text-white font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t('topic_all', lang)} {stats && `(${stats.totalAlerts})`}
          </button>
          
          {topicIdsToShow.map(topicId => {
            const meta = topicMetaById[topicId] || { label: topicId };
            const count = stats?.byTopic?.[topicId] ?? 0;
            const active = selectedTopic === topicId;

            return (
              <div key={topicId} className="space-y-1">
                <button
                  onClick={() => setTopic(topicId)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-start gap-2 ${
                    active
                      ? "bg-primary-700 text-white font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="inline-flex items-start gap-2 min-w-0 flex-1">
                    {meta.icon ? <span className="text-base leading-none mt-0.5">{meta.icon}</span> : null}
                    <span className="whitespace-normal break-words leading-tight">{meta.label}</span>
                  </span>
                  <span className={`text-xs tabular-nums flex-shrink-0 ${count === 0 ? "opacity-40" : "opacity-70"}`}>
                    {count}
                  </span>
                </button>

                {/* Microsoft sub-categories */}
                {topicId === "microsoft" && (
                  <div className="ml-8 space-y-1">
                    <button
                      type="button"
                      onClick={setMicrosoftSecurity}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex justify-between gap-2"
                    >
                      <span className="truncate">Sicherheit</span>
                      <span className={`tabular-nums ${microsoftSubCounts.security === 0 ? "opacity-40" : "opacity-70"}`}>
                        {microsoftSubCounts.security}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={setMicrosoftM365Updates}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex justify-between gap-2"
                    >
                      <span className="truncate">M365-Updates</span>
                      <span className={`tabular-nums ${microsoftSubCounts.m365Updates === 0 ? "opacity-40" : "opacity-70"}`}>
                        {microsoftSubCounts.m365Updates}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={setMicrosoftM365Health}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition flex justify-between gap-2"
                    >
                      <span className="truncate">M365 Health</span>
                      <span className={`tabular-nums ${microsoftSubCounts.m365Health === 0 ? "opacity-40" : "opacity-70"}`}>
                        {microsoftSubCounts.m365Health}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{t('dashboard_title', lang)}</h1>
              <p className="text-text-secondary mt-1">{t('dashboard_subtitle', lang)}</p>
            </div>
            <TimeRangeSelector />
          </div>
        </div>

        {loading && <Loading text={t("loading_dashboard", lang)} />}

        {!loading && stats && threat && (
          <>
            {/* Threat Score Banner */}
            <ThreatScoreBanner
              threat={threat}
              stats={{
                critical: stats.bySeverity.critical,
                high: stats.bySeverity.high,
                exploited: stats.activelyExploited,
                zeroDays: stats.zeroDays
              }}
              date={formattedDate}
              locale={lang}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button
                onClick={() => setSeverity(null)}
                className={`rounded-xl border p-5 text-left transition-all ${
                  !selectedSeverity
                    ? 'ring-2 ring-primary-400 bg-white border-gray-200'
                    : 'bg-white border-gray-200 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('alerts_today', lang)}
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{stats.totalAlerts}</div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <TrendArrow current={stats.totalAlerts} previous={stats.trend?.previousPeriodTotal ?? 0} />
                  {stats.dailyCounts?.length ? (
                    <TrendSparkline
                      data={stats.dailyCounts.map(d => ({ date: d.date, value: d.total }))}
                      height={32}
                      width={90}
                      color="#2563eb"
                    />
                  ) : null}
                </div>
              </button>

              <button
                onClick={() => setSeverity('critical')}
                className={`rounded-xl border p-5 text-left transition-all ${
                  selectedSeverity === 'critical'
                    ? 'ring-2 ring-red-400 bg-red-50/60 border-red-200'
                    : 'bg-red-50/60 border-red-200 hover:bg-red-50 cursor-pointer'
                }`}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sev_critical', lang)}
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{stats.bySeverity.critical}</div>
                <div className="mt-1">
                  <TrendArrow
                    current={stats.bySeverity.critical}
                    previous={stats.trend?.previousPeriodBySeverity?.critical ?? 0}
                  />
                </div>
              </button>

              <button
                onClick={() => setSeverity('high')}
                className={`rounded-xl border p-5 text-left transition-all ${
                  selectedSeverity === 'high'
                    ? 'ring-2 ring-orange-400 bg-orange-50/60 border-orange-200'
                    : 'bg-orange-50/60 border-orange-200 hover:bg-orange-50 cursor-pointer'
                }`}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sev_high', lang)}
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{stats.bySeverity.high}</div>
                <div className="mt-1">
                  <TrendArrow
                    current={stats.bySeverity.high}
                    previous={stats.trend?.previousPeriodBySeverity?.high ?? 0}
                  />
                </div>
              </button>

              <button
                onClick={() => setSeverity('medium')}
                className={`rounded-xl border p-5 text-left transition-all ${
                  selectedSeverity === 'medium'
                    ? 'ring-2 ring-amber-400 bg-amber-50/60 border-amber-200'
                    : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50 cursor-pointer'
                }`}
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('sev_medium', lang)}
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{stats.bySeverity.medium}</div>
                <div className="mt-1">
                  <TrendArrow
                    current={stats.bySeverity.medium}
                    previous={stats.trend?.previousPeriodBySeverity?.medium ?? 0}
                  />
                </div>
              </button>

              <button
                className="rounded-xl border p-5 text-left bg-purple-50/60 border-purple-200 hover:bg-purple-50"
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("label_exploited", lang)}
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-1">{stats.activelyExploited}</div>
              </button>
            </div>

            {/* Compliance strip (top, clickable) */}
            {stats?.compliance && (
              <ComplianceStrip
                compliance={stats.compliance}
                totalAlerts={stats.totalAlerts}
                lang={lang}
                timeQuery={complianceTimeQuery}
              />
            )}

            {/* Active filters */}
            {(selectedSeverity || selectedTopic || selectedSource || selectedType) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">{t('filter_label', lang)}:</span>
                {selectedSeverity && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    {severityFullLabel(selectedSeverity, lang)}
                    <button onClick={() => setSeverity(null)} className="hover:text-red-600 ml-1">✕</button>
                  </span>
                )}
                {selectedTopic && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <span className="truncate max-w-[220px]">{selectedTopicLabel}</span>
                    <button onClick={() => setTopic(null)} className="hover:text-blue-600 ml-1">✕</button>
                  </span>
                )}
                {selectedSource && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm">
                    <span className="truncate max-w-[260px]">{selectedSource}</span>
                    <button onClick={() => setQuery({ source: null })} className="hover:text-slate-600 ml-1">✕</button>
                  </span>
                )}
                {selectedType && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    <span className="truncate max-w-[220px]">{selectedTypeLabel}</span>
                    <button onClick={() => setQuery({ type: null })} className="hover:text-purple-600 ml-1">✕</button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                >
                  {t('clear_filters', lang)}
                </button>
              </div>
            )}

            {/* Top exploited / urgent */}
            {urgentAlerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wider">
                    {t("immediate_action", lang)}
                  </h3>
                  <span className="ml-auto text-xs text-red-600 font-mono">{urgentAlerts.length}</span>
                </div>
                <div className="space-y-2">
                  {urgentAlerts.slice(0, 5).map(alert => (
                    <Link
                      key={alert.id}
                      href={`/meldung/${alert.id}`}
                      className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-red-100 hover:bg-red-50/50 transition"
                    >
                      <span className="text-lg font-bold font-mono text-red-700 w-10 text-center">
                        {alert.aiScore ?? 0}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {alert.titleDe ? alert.titleDe : alert.title}
                        </p>
                      </div>
                      {alert.isActivelyExploited && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🔥 Exploit</span>
                      )}
                      {alert.isZeroDay && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚡ 0-Day</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Alert List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedTopic 
                    ? `${t('todays_alerts', lang)}: ${selectedTopicLabel}`
                    : stats?.timeRange?.days === 0 ? t('todays_alerts', lang) : `Meldungen (${rangeLabel})`
                  }
                </h2>
                <span className="text-sm text-gray-500">{t('sorted_by', lang)}: Score</span>
              </div>

              {/* Column headers */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 hidden md:grid md:grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="col-span-1 text-center">{t('col_score', lang)}</div>
                <div className="col-span-1 text-center">{t('col_severity', lang)}</div>
                <div className="col-span-7">{t('col_title', lang)}</div>
                <div className="col-span-2 hidden lg:block">{t('col_topic', lang)}</div>
                <div className="col-span-1 text-right">{t('col_date', lang)}</div>
              </div>

              <div className="divide-y divide-gray-100">
                {regularAlerts.map(alert => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    lang={lang}
                    topicMetaById={topicMetaById}
                    alertStatus={statusByAlertId[alert.id] || "new"}
                    href={`/meldung/${alert.id}`}
                  />
                ))}
              </div>

            {alerts && alerts.total > 20 && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <Link
                  href={buildMeldungenLink()}
                  className="text-sm text-primary-700 hover:text-primary-800 font-medium"
                >
                  {t('show_all', lang)} →
                </Link>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


