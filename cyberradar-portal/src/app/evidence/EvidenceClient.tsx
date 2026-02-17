// © 2025 CyberLage
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, Printer, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";
import { cn, formatDateTime } from "@/lib/utils";
import type { ComplianceMetrics } from "@/lib/audit";

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-text-primary">{value}</p>
    </div>
  );
}

export default function EvidenceClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useAppShell();

  const daysParam = params.get("days");
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  const days = useMemo(() => {
    if (startDate || endDate) return null;
    const d = Number.parseInt(daysParam || "30", 10);
    return Number.isFinite(d) ? d : 30;
  }, [daysParam, startDate, endDate]);

  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const qp = new URLSearchParams();
        if (startDate) qp.set("startDate", startDate);
        if (endDate) qp.set("endDate", endDate);
        if (!startDate && !endDate) qp.set("days", String(days ?? 30));

        const res = await fetch(`/api/evidence-pack?${qp.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to retrieve evidence package");
        const json = (await res.json()) as ComplianceMetrics;
        if (!cancelled) setMetrics(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Evidence package could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [days, startDate, endDate]);

  function setDays(next: number) {
    const qp = new URLSearchParams(params.toString());
    qp.delete("startDate");
    qp.delete("endDate");
    qp.set("days", String(next));
    router.push(`/evidence?${qp.toString()}`);
  }

  function setCustomRange(nextStart: string, nextEnd: string) {
    const qp = new URLSearchParams(params.toString());
    qp.delete("days");
    if (nextStart) qp.set("startDate", nextStart);
    else qp.delete("startDate");
    if (nextEnd) qp.set("endDate", nextEnd);
    else qp.delete("endDate");
    router.push(`/evidence?${qp.toString()}`);
  }

  const generatedAt = useMemo(() => new Date().toISOString(), []);

  const copyText = useMemo(() => {
    if (!metrics) return "";
    const lines: string[] = [];
    lines.push("CyberLage - NIS2 Evidence Package");
    lines.push(`Period: ${metrics.period.from} -> ${metrics.period.to}`);
    lines.push("");
    lines.push(`Alerts: ${metrics.totalAlerts}`);
    lines.push(`Acknowledged: ${metrics.acknowledged} (${metrics.acknowledgedPercent}%)`);
    lines.push(`Resolved: ${metrics.resolved} (${metrics.resolvedPercent}%)`);
    lines.push(`Dismissed: ${metrics.dismissed}`);
    lines.push(
      `Avg response time: ${metrics.avgResponseTimeHours !== null ? metrics.avgResponseTimeHours + " h" : "-"}`
    );
    lines.push(
      `Avg resolution time: ${metrics.avgResolutionTimeHours !== null ? metrics.avgResolutionTimeHours + " h" : "-"}`
    );
    lines.push("");
    lines.push("Open critical/high alerts:");
    if (metrics.unresolved.length === 0) {
      lines.push("- None");
    } else {
      for (const u of metrics.unresolved) {
        lines.push(`- [${u.severity}] ${u.title} (${u.daysOpen}d) — ${u.alertId}`);
      }
    }
    lines.push("");
    lines.push(`Erstellt: ${generatedAt}`);
    return lines.join("\n");
  }, [generatedAt, metrics]);

  if (loading) {
    return <Loading text="Loading evidence..." />;
  }

  if (error) {
    return (
      <Card className="p-10 text-center">
        <p className="text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-3 inline-flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800"
        >
          <RefreshCw className="w-4 h-4" /> Reload
        </button>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-10 text-center">
        <p className="text-text-secondary">No data.</p>
      </Card>
    );
  }

  const severityRows = Object.entries(metrics.bySeverity).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("evidence_title", lang)}</h1>
          <p className="text-text-secondary mt-1">{t("evidence_subtitle", lang)}</p>
          <p className="text-xs text-text-muted mt-2">
            Generated: {formatDateTime(generatedAt, lang)}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(copyText);
            }}
            className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-text-secondary hover:bg-hover transition inline-flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-3 rounded-lg bg-primary-800 text-white text-sm font-semibold hover:bg-primary-700 transition inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      <Card className="p-5 no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-text-secondary">Period:</span>
          <button
            type="button"
            onClick={() => setDays(30)}
            className={cn(
              "h-9 px-3 rounded-lg text-sm border transition",
              days === 30 && !startDate && !endDate
                ? "bg-primary-700 text-white border-primary-700"
                : "bg-white text-text-secondary border-slate-200 hover:bg-hover"
              )}
          >
            30 days
          </button>
          <button
            type="button"
            onClick={() => setDays(90)}
            className={cn(
              "h-9 px-3 rounded-lg text-sm border transition",
              days === 90 && !startDate && !endDate
                ? "bg-primary-700 text-white border-primary-700"
                : "bg-white text-text-secondary border-slate-200 hover:bg-hover"
              )}
          >
            90 days
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">or custom range:</span>
            <input
              type="date"
              value={startDate || ""}
              onChange={e => setCustomRange(e.target.value, endDate || "")}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm"
            />
            <span className="text-xs text-text-muted">→</span>
            <input
              type="date"
              value={endDate || ""}
              onChange={e => setCustomRange(startDate || "", e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatBox label="Alerts" value={metrics.totalAlerts} />
        <StatBox
          label="Acknowledged"
          value={
            <>
              {metrics.acknowledgedPercent}%{" "}
              <span className="text-sm text-text-muted font-normal">({metrics.acknowledged})</span>
            </>
          }
        />
        <StatBox
          label="Resolved"
          value={
            <>
              {metrics.resolvedPercent}%{" "}
              <span className="text-sm text-text-muted font-normal">({metrics.resolved})</span>
            </>
          }
        />
        <StatBox label="Dismissed" value={metrics.dismissed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            MTTR / process
          </h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              Avg response time (published {"->"} awareness time):{" "}
              <span className="font-mono text-text-primary">
                {metrics.avgResponseTimeHours !== null ? `${metrics.avgResponseTimeHours} h` : "—"}
              </span>
            </p>
            <p>
              Avg resolution time (awareness time {"->"} resolved):{" "}
              <span className="font-mono text-text-primary">
                {metrics.avgResolutionTimeHours !== null ? `${metrics.avgResolutionTimeHours} h` : "—"}
              </span>
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            Status distribution
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(metrics.byStatus).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-text-muted">{k}</p>
                <p className="mt-1 font-mono font-semibold text-text-primary">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Breakdown by severity
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="py-2 pr-4">Severity</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Acknowledged</th>
                <th className="py-2">Resolved</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {severityRows.map(([sev, s]) => (
                <tr key={sev} className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-semibold text-text-primary">{sev}</td>
                  <td className="py-3 pr-4 font-mono">{s.total}</td>
                  <td className="py-3 pr-4 font-mono">{s.acknowledged}</td>
                  <td className="py-3 font-mono">{s.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Open critical/high alerts
        </h2>
        {metrics.unresolved.length === 0 ? (
          <p className="text-sm text-text-secondary">No open critical/high alerts.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {metrics.unresolved.map(u => (
              <Link
                key={u.alertId}
                href={`/meldung/${u.alertId}`}
                className="flex items-start justify-between gap-3 py-3 hover:bg-hover/40 px-2 -mx-2 rounded-lg transition"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{u.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 font-mono">{u.alertId}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-text-secondary">
                    {u.severity}
                  </span>
                  <p className="text-xs text-text-muted mt-1">{u.daysOpen}d</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 bg-slate-50 border border-slate-200">
        <p className="text-xs text-text-muted">
          Note: This evidence package is based on alerts captured in CyberLage and internal status/audit entries.
          It does not replace legal advice.
        </p>
      </Card>
    </div>
  );
}



