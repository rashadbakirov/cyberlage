// © 2025 CyberLage
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
} from "lucide-react";
import TimeRangeSelector from "@/components/layout/TimeRangeSelector";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Loading from "@/components/ui/Loading";
import { useAppShell } from "@/components/layout/AppShell";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { TOPICS } from "@/lib/topics";
import { t } from "@/lib/translations";

type TranslationKey = keyof typeof import("@/lib/translations").translations.de;

type AlertSummary = {
  id: string;
  title: string;
  titleDe: string | null;
  summaryDe: string | null;
  summary: string | null;
  severity: string | null;
  aiScore: number | null;
  cvssScore: number | null;
  epssScore: number | null;
  isActivelyExploited: boolean;
  isZeroDay: boolean;
  alertType: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string;
  fetchedAt: string;
  topics: string[];
  compliance: {
    nis2Relevant: string | null;
    doraRelevant: string | null;
    gdprRelevant: string | null;
    reportingRequired: boolean;
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

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function setList(params: URLSearchParams, key: string, values: string[]) {
  if (values.length === 0) params.delete(key);
  else params.set(key, values.join(","));
}

const SEVERITIES: Array<{ id: string; labelKey: TranslationKey }> = [
  { id: "critical", labelKey: "sev_critical" },
  { id: "high", labelKey: "sev_high" },
  { id: "medium", labelKey: "sev_medium" },
  { id: "low", labelKey: "sev_low" },
  { id: "info", labelKey: "sev_info" },
];

const TYPES: Array<{ id: string; labelKey: TranslationKey }> = [
  { id: "vulnerability", labelKey: "type_vulnerability" },
  { id: "exploit", labelKey: "type_exploit" },
  { id: "breach", labelKey: "type_breach" },
  { id: "malware", labelKey: "type_malware" },
  { id: "apt", labelKey: "type_apt" },
  { id: "advisory", labelKey: "type_advisory" },
  { id: "guidance", labelKey: "type_guidance" },
  { id: "m365-update", labelKey: "type_m365_update" },
  { id: "m365-health", labelKey: "type_m365_health" },
  { id: "m365-roadmap", labelKey: "type_m365_roadmap" },
];

const SOURCES = [
  { id: "BSI CERT-Bund (WID) Sicherheitshinweise", label: "BSI CERT-Bund" },
  { id: "CISA Cybersecurity Advisories", label: "CISA Advisories" },
  { id: "CISA Industrial Control Systems Advisories", label: "CISA ICS" },
  { id: "CISA Known Exploited Vulnerabilities Catalog", label: "CISA KEV" },
  { id: "Microsoft Security Response Center", label: "Microsoft MSRC" },
  { id: "Microsoft 365 Message Center", label: "M365 Message Center" },
  { id: "Microsoft 365 Service Health", label: "M365 Service Health" },
  { id: "Microsoft 365 Roadmap", label: "M365 Roadmap" },
  { id: "Fortinet Product Security Incident Response Team", label: "Fortinet PSIRT" },
  { id: "Siemens ProductCERT Security Advisories", label: "Siemens ProductCERT" },
  { id: "heise Security", label: "heise Security" },
  { id: "The Hacker News", label: "The Hacker News" },
  { id: "BleepingComputer Security", label: "BleepingComputer" },
];

export default function MeldungenClient() {
  const router = useRouter();
  const pathname = usePathname() || "/meldungen";
  const params = useSearchParams();
  const { lang } = useAppShell();

  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10));
  const searchParam = params.get("search") || "";

  const selectedSeverities = useMemo(() => parseList(params.get("severity")).map(s => s.toLowerCase()), [params]);
  const selectedTopics = useMemo(() => parseList(params.get("topic")).map(s => s.toLowerCase()), [params]);
  const selectedSources = useMemo(() => parseList(params.get("source")), [params]);
  const selectedCompliance = useMemo(() => parseList(params.get("compliance")).map(s => s.toLowerCase()), [params]);
  const selectedTypes = useMemo(() => parseList(params.get("type")).map(s => s.toLowerCase()), [params]);

  const severityCsv = useMemo(() => selectedSeverities.join(","), [selectedSeverities]);
  const topicCsv = useMemo(() => selectedTopics.join(","), [selectedTopics]);
  const sourceCsv = useMemo(() => selectedSources.join(","), [selectedSources]);
  const complianceCsv = useMemo(() => selectedCompliance.join(","), [selectedCompliance]);
  const typeCsv = useMemo(() => selectedTypes.join(","), [selectedTypes]);

  const reportingOnly = (params.get("reportingOnly") || "").toLowerCase() === "true";
  const exploitedOnly = (params.get("exploitedOnly") || "").toLowerCase() === "true";

  const days = params.get("days");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const [data, setData] = useState<AlertsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParam);

  const topicLabelById = useMemo(() => {
    const map: Record<string, string> = { general: "Allgemein" };
    for (const t of TOPICS) map[t.id] = t.label;
    return map;
  }, []);

  function updateQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in updates)) next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  function toggleListParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    const current = new Set(parseList(next.get(key)).map(v => v.toLowerCase()));
    const v = value.toLowerCase();
    if (current.has(v)) current.delete(v);
    else current.add(v);
    setList(next, key, Array.from(current));
    next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  function setBoolParam(key: string, value: boolean) {
    updateQuery({ [key]: value ? "true" : null });
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchInput.trim() || null });
  }

  function clearAll() {
    const next = new URLSearchParams();
    if (days) next.set("days", days);
    if (startDate) next.set("startDate", startDate);
    if (endDate) next.set("endDate", endDate);
    const query = next.toString();
    router.push(query ? `/meldungen?${query}` : "/meldungen");
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const qp = new URLSearchParams();
        qp.set("page", String(page));
        qp.set("pageSize", "25");
        qp.set("sortBy", "score");
        qp.set("sortDir", "DESC");

        if (days) qp.set("days", days);
        if (startDate) qp.set("startDate", startDate);
        if (endDate) qp.set("endDate", endDate);

        if (severityCsv) qp.set("severity", severityCsv);
        if (topicCsv) qp.set("topic", topicCsv);
        if (sourceCsv) qp.set("source", sourceCsv);
        if (complianceCsv) qp.set("compliance", complianceCsv);
        if (typeCsv) qp.set("type", typeCsv);
        if (reportingOnly) qp.set("reportingOnly", "true");
        if (exploitedOnly) qp.set("exploitedOnly", "true");
        if (searchParam) qp.set("search", searchParam);

        const res = await fetch(`/api/alerts?${qp.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Abruf der Meldungen fehlgeschlagen");
        const json = (await res.json()) as AlertsApiResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    days,
    startDate,
    endDate,
    severityCsv,
    topicCsv,
    sourceCsv,
    complianceCsv,
    typeCsv,
    reportingOnly,
    exploitedOnly,
    searchParam,
  ]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("page_all_alerts", lang)}</h1>
          <p className="text-text-secondary mt-1">
            {data ? `${data.total.toLocaleString("de-DE")} ${t("label_alerts", lang)}` : "—"}
          </p>
        </div>
        <TimeRangeSelector />
      </div>

      <Card className="p-5">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <form onSubmit={onSearchSubmit} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t("search_placeholder", lang)}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600"
              />
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <FilterMenu label={t("filter_severity", lang)} activeCount={selectedSeverities.length}>
              {SEVERITIES.map(s => (
                <CheckboxRow
                  key={s.id}
                  label={t(s.labelKey, lang)}
                  checked={selectedSeverities.includes(s.id)}
                  onToggle={() => toggleListParam("severity", s.id)}
                />
              ))}
            </FilterMenu>

            <FilterMenu label={t("filter_topic", lang)} activeCount={selectedTopics.length}>
              {TOPICS.map(topic => (
                <CheckboxRow
                  key={topic.id}
                  label={`${topic.icon} ${topic.label}`}
                  checked={selectedTopics.includes(topic.id)}
                  onToggle={() => toggleListParam("topic", topic.id)}
                />
              ))}
            </FilterMenu>

            <FilterMenu label={t("filter_source", lang)} activeCount={selectedSources.length}>
              {SOURCES.map(s => (
                <CheckboxRow
                  key={s.id}
                  label={s.label}
                  checked={selectedSources.map(x => x.toLowerCase()).includes(s.id.toLowerCase())}
                  onToggle={() => toggleListParam("source", s.id)}
                />
              ))}
            </FilterMenu>

            <FilterMenu label={t("filter_compliance", lang)} activeCount={selectedCompliance.length + (reportingOnly ? 1 : 0)}>
              <CheckboxRow
                label={`⚠️ ${t("compliance_reporting", lang)}`}
                checked={reportingOnly}
                onToggle={() => setBoolParam("reportingOnly", !reportingOnly)}
              />
              <CheckboxRow
                label="NIS2"
                checked={selectedCompliance.includes("nis2")}
                onToggle={() => toggleListParam("compliance", "nis2")}
              />
              <CheckboxRow
                label="DORA"
                checked={selectedCompliance.includes("dora")}
                onToggle={() => toggleListParam("compliance", "dora")}
              />
              <CheckboxRow
                label="DSGVO"
                checked={selectedCompliance.includes("gdpr")}
                onToggle={() => toggleListParam("compliance", "gdpr")}
              />
            </FilterMenu>

            <FilterMenu label={t("filter_type", lang)} activeCount={selectedTypes.length}>
              {TYPES.map(type => (
                <CheckboxRow
                  key={type.id}
                  label={t(type.labelKey, lang)}
                  checked={selectedTypes.includes(type.id)}
                  onToggle={() => toggleListParam("type", type.id)}
                />
              ))}
            </FilterMenu>

            <button
              type="button"
              onClick={() => setBoolParam("exploitedOnly", !exploitedOnly)}
              className={cn(
                "h-10 px-3 rounded-lg border text-sm flex items-center gap-2 transition",
                exploitedOnly
                  ? "bg-primary-50 border-primary-100 text-primary-900"
                  : "bg-card border-slate-200 text-text-secondary hover:bg-hover"
              )}
            >
              <ShieldAlert className="w-4 h-4" />
              {t("filter_exploited", lang)}
            </button>

            {(selectedSeverities.length ||
              selectedTopics.length ||
              selectedCompliance.length ||
              selectedTypes.length ||
              selectedSources.length ||
              exploitedOnly ||
              reportingOnly ||
              searchParam ||
              days ||
              startDate ||
              endDate) && (
              <button
                type="button"
                onClick={clearAll}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-card text-sm text-text-secondary hover:bg-hover transition"
              >
                {t("label_reset", lang)}
              </button>
            )}
          </div>
        </div>
      </Card>

      {loading && <Loading text={t("loading_alerts", lang)} />}

      {!loading && data && data.alerts.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-[72px_104px_1fr_160px_120px] px-4 h-11 items-center bg-slate-50 border-b border-slate-200 text-xs font-semibold text-text-muted uppercase tracking-wider">
            <div>{t("col_score", lang)}</div>
            <div>{t("col_severity", lang)}</div>
            <div>{t("col_title", lang)}</div>
            <div>{t("col_topic", lang)}</div>
            <div>{t("col_date", lang)}</div>
          </div>

          <div className="divide-y divide-slate-200">
            {data.alerts.map((a, idx) => {
              const firstTopic = a.topics?.[0] || "general";
              return (
                <Link
                  key={a.id}
                  href={`/meldung/${a.id}`}
                  className={cn(
                    "grid grid-cols-[72px_104px_1fr_160px_120px] px-4 py-2 items-center min-h-[64px] transition",
                    idx % 2 === 0 ? "bg-card" : "bg-slate-50/40",
                    "hover:bg-hover"
                  )}
                >
                  <div className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                    {typeof a.aiScore === "number" ? a.aiScore : "—"}
                  </div>
                  <div>
                    <Badge severity={a.severity} compact lang={lang} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">{a.titleDe || a.title}</p>
                    <div className="text-xs text-text-secondary truncate">
                      {a.summaryDe || a.summary || ""}
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary truncate">
                    {topicLabelById[firstTopic] || firstTopic}
                  </div>
                  <div className="text-xs text-text-muted">
                    {data.timeRange.days === 0 ? timeAgo(a.publishedAt, lang) : formatDate(a.publishedAt, lang)}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {!loading && data && data.alerts.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-text-secondary">{t("no_results", lang)}</p>
        </Card>
      )}

      {!loading && data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {t("label_page", lang)} {data.page} {t("label_of", lang)} {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: String(page - 1) })}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-card text-sm text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("label_previous", lang)}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => updateQuery({ page: String(page + 1) })}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-card text-sm text-text-secondary hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
            >
              {t("label_next", lang)}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterMenu({
  label,
  activeCount,
  children,
}: {
  label: string;
  activeCount: number;
  children: React.ReactNode;
}) {
  return (
    <details className="relative">
      <summary className="list-none">
        <span
          className={cn(
            "h-10 px-3 rounded-lg border bg-card text-sm text-text-secondary hover:bg-hover transition inline-flex items-center gap-2 cursor-pointer",
            activeCount > 0 && "bg-primary-50 border-primary-100 text-primary-900"
          )}
        >
          {label}
          {activeCount > 0 && (
            <span className="text-xs font-semibold bg-white border border-slate-200 rounded-full px-2 py-0.5 tabular-nums">
              {activeCount}
            </span>
          )}
          <ChevronDown className="w-4 h-4" />
        </span>
      </summary>
      <div className="absolute z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-card shadow-[0_10px_30px_rgba(0,0,0,0.12)] p-3">
        <div className="max-h-64 overflow-auto pr-1 space-y-2">{children}</div>
      </div>
    </details>
  );
}

function CheckboxRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={onToggle} className="w-4 h-4 accent-primary-700" />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}


