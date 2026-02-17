// © 2025 CyberLage
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Flame, Globe, Info, ShieldAlert } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import ScoreBar from "@/components/alerts/ScoreBar";
import ComplianceCard from "@/components/alerts/ComplianceCard";
import MeldepflichtBanner from "@/components/meldepflicht/MeldepflichtBanner";
import { useAppShell } from "@/components/layout/AppShell";
import { isMeldepflichtRelevant } from "@/lib/meldepflicht";
import { categorizeAlert, TOPICS } from "@/lib/topics";
import { cn, formatDateTime, truncate } from "@/lib/utils";
import { t } from "@/lib/translations";
import type { Alert } from "@/types/alert";

export const dynamic = "force-dynamic";

export default function MeldungDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useAppShell();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("not found");
        const json = (await res.json()) as Alert;
        if (!cancelled) setAlert(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) setAlert(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const topics = useMemo(() => {
    if (!alert) return [];
    return categorizeAlert({
      title: alert.titleDe || alert.title,
      affectedProducts: alert.affectedProducts || [],
      affectedVendors: alert.affectedVendors || [],
      alertType: alert.alertType,
      sourceName: alert.sourceName,
    });
  }, [alert]);

  const topicLabel = useMemo(() => {
    const map: Record<string, string> = { general: lang === "de" ? "Allgemein" : "General" };
    for (const t of TOPICS) map[t.id] = lang === "de" ? t.label : t.labelEn;
    return map;
  }, [lang]);

  if (loading) {
    return <Loading text={t("loading_alert", lang)} />;
  }

  if (!alert) {
    return (
      <Card className="p-10 text-center">
        <p className="text-text-secondary">{t("label_not_found", lang)}</p>
        <Link href="/meldungen" className="text-primary-700 hover:text-primary-800 text-sm mt-2 inline-block">
          {t("back_to_alerts", lang)}
        </Link>
      </Card>
    );
  }

  const title = alert.titleDe || alert.title;
  const summary = alert.summaryDe || alert.summary;

  const dateLabel = formatDateTime(alert.publishedAt || alert.fetchedAt, lang);

  return (
    <div className="space-y-6">
      <Link
        href="/meldungen"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition"
      >
        <ArrowLeft className="w-4 h-4" /> {t("back_to_alerts", lang)}
      </Link>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge severity={alert.severity} lang={lang} />
              {typeof alert.aiScore === "number" && (
                <span className="text-sm font-mono font-semibold text-text-secondary">
                  Score: {alert.aiScore}/100
                </span>
              )}
              {alert.isActivelyExploited && (
                <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> {t("label_exploited", lang)}
                </span>
              )}
              {alert.isZeroDay && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> {t("label_zeroday", lang)}
                </span>
              )}
            </div>

            <h1 className="mt-3 text-xl font-bold text-text-primary leading-tight">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> {alert.sourceName || alert.sourceId}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Info className="w-4 h-4" /> {dateLabel}
              </span>
              {alert.sourceUrl && (
                <a
                  href={alert.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary-700 hover:text-primary-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t("label_open_source", lang)}
                </a>
              )}
            </div>
          </div>

        </div>
      </Card>

      {isMeldepflichtRelevant(alert) && (
        <MeldepflichtBanner alert={alert} lang={lang} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            {t("section_assessment", lang)}
          </h2>
          <ScoreBar score={alert.aiScore ?? null} severity={alert.severity} />
          <div className="mt-2">
            <Link
              href="/score"
              className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 hover:underline"
            >
              <Info className="w-3.5 h-3.5" /> {t("score_method_link", lang)}
            </Link>
          </div>
          {alert.scoreComponents && (
            <div className="mt-3 flex gap-3 text-xs flex-wrap">
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                Basis: {alert.scoreComponents.base}
              </span>
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded">
                EPSS: {alert.scoreComponents.epss}
              </span>
              <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                Bedrohung: {alert.scoreComponents.threat}
              </span>
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                Kontext: {alert.scoreComponents.context}
              </span>
            </div>
          )}
          {alert.aiScoreReasoning && (
            <div className="mt-4">
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{t("label_reasoning", lang)}: </span>
                {truncate(alert.aiScoreReasoning, 320)}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            {t("section_details", lang)}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoBox label="CVSS" value={alert.cvssScore !== null && alert.cvssScore !== undefined ? String(alert.cvssScore) : "—"} mono />
            <InfoBox
              label="EPSS"
              value={
                alert.epssScore !== null && alert.epssScore !== undefined && alert.epssScore > 0
                  ? `${(alert.epssScore * 100).toFixed(1)}%`
                  : "—"
              }
              mono
            />
            <InfoBox
              label="CVEs"
              value={alert.cveIds?.length ? `${alert.cveIds.length}` : "—"}
              mono
            />
            <InfoBox label={t("label_type", lang)} value={alert.alertType || "—"} />
          </div>

          <div className="mt-4">
            <p className="text-xs text-text-muted mb-2">{t("label_cve_ids", lang)}</p>
            {alert.cveIds?.length ? (
              <div className="flex flex-wrap gap-2">
                {alert.cveIds.slice(0, 10).map(cve => (
                  <a
                    key={cve}
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-text-secondary hover:bg-hover transition"
                  >
                    {cve}
                  </a>
                ))}
                {alert.cveIds.length > 10 && (
                  <span className="text-xs text-text-muted">+{alert.cveIds.length - 10}</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">{t("label_no_cve_ids", lang)}</p>
            )}
          </div>

          {(alert.affectedProducts?.length || alert.affectedVersions?.length || alert.affectedVendors?.length) ? (
            <div className="mt-6">
              <p className="text-xs text-text-muted mb-2">{t("label_affected_systems", lang)}</p>
              <div className="space-y-2">
                {alert.affectedProducts?.length ? (
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{t("label_products", lang)}:</span>{" "}
                    {alert.affectedProducts.slice(0, 8).join(", ")}
                    {alert.affectedProducts.length > 8 ? ` +${alert.affectedProducts.length - 8}` : ""}
                  </p>
                ) : null}
                {alert.affectedVersions?.length ? (
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{t("label_versions", lang)}:</span>{" "}
                    {alert.affectedVersions.slice(0, 6).join(", ")}
                    {alert.affectedVersions.length > 6 ? ` +${alert.affectedVersions.length - 6}` : ""}
                  </p>
                ) : null}
                {alert.affectedVendors?.length ? (
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">{t("label_vendors", lang)}:</span>{" "}
                    {alert.affectedVendors.slice(0, 6).join(", ")}
                    {alert.affectedVendors.length > 6 ? ` +${alert.affectedVendors.length - 6}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      {summary && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              {t("section_summary", lang)}
            </h2>
          </div>
          <p className="text-text-secondary leading-relaxed">{summary}</p>
        </Card>
      )}

      {alert.compliance && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            {t("section_compliance", lang)}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {alert.compliance.nis2 && alert.compliance.nis2.relevant !== "no" && (
              <ComplianceCard title="NIS2" data={alert.compliance.nis2} lang={lang} />
            )}
            {alert.compliance.dora && alert.compliance.dora.relevant !== "no" && (
              <ComplianceCard title="DORA" data={alert.compliance.dora} lang={lang} />
            )}
            {alert.compliance.gdpr && alert.compliance.gdpr.relevant !== "no" && (
              <ComplianceCard title="DSGVO" data={alert.compliance.gdpr} lang={lang} />
            )}
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            {t("section_topics", lang)}
          </h2>
          <div className="flex flex-wrap gap-2">
            {topics.map(t => (
              <span key={t} className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-text-secondary">
                {topicLabel[t] || t}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn("text-sm font-semibold text-text-primary mt-1", mono && "font-mono tabular-nums")}>{value}</p>
    </div>
  );
}
