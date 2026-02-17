// © 2025 CyberLage
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import TimeRangeSelector from "@/components/layout/TimeRangeSelector";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";
import type { PortalStatsResponse } from "@/types/alert";

type StatsApiResponse = PortalStatsResponse & {
  timeRange: { start: string; end: string; days: number | null; labelDe: string; labelEn: string };
};

const SOURCE_LINKS: Record<string, string> = {
  "BSI CERT-Bund (WID) Sicherheitshinweise": "https://wid.cert-bund.de/portal/wid/securityadvisory",
  "CISA Cybersecurity Advisories": "https://www.cisa.gov/news-events/cybersecurity-advisories",
  "CISA Industrial Control Systems Advisories": "https://www.cisa.gov/news-events/advisories",
  "CISA Known Exploited Vulnerabilities Catalog": "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
  "Microsoft Security Response Center": "https://msrc.microsoft.com/update-guide",
  "Microsoft 365 Message Center": "https://admin.microsoft.com/Adminportal/Home#/MessageCenter",
  "Microsoft 365 Service Health": "https://admin.microsoft.com/Adminportal/Home#/servicehealth",
  "Microsoft 365 Roadmap": "https://www.microsoft.com/en-us/microsoft-365/roadmap",
  "Fortinet Product Security Incident Response Team": "https://www.fortiguard.com/psirt",
  "Siemens ProductCERT Security Advisories": "https://cert-portal.siemens.com/productcert/html/ssa.html",
  "heise Security": "https://www.heise.de/security/",
  "The Hacker News": "https://thehackernews.com/",
  "BleepingComputer Security": "https://www.bleepingcomputer.com/",
};

const CATEGORY_MAP: Array<{ category: string; sources: string[] }> = [
  {
    category: "Behördlich (Tier 1)",
    sources: [
      "BSI CERT-Bund (WID) Sicherheitshinweise",
      "CISA Cybersecurity Advisories",
      "CISA Industrial Control Systems Advisories",
      "CISA Known Exploited Vulnerabilities Catalog",
    ],
  },
  {
    category: "Microsoft 365",
    sources: [
      "Microsoft 365 Message Center",
      "Microsoft 365 Service Health",
      "Microsoft 365 Roadmap",
    ],
  },
  {
    category: "Hersteller (Tier 1)",
    sources: [
      "Microsoft Security Response Center",
      "Fortinet Product Security Incident Response Team",
      "Siemens ProductCERT Security Advisories",
    ],
  },
  {
    category: "Fachmedien (Tier 2)",
    sources: ["The Hacker News", "heise Security", "BleepingComputer Security"],
  },
];

export default function QuellenClient() {
  const params = useSearchParams();
  const { lang } = useAppShell();
  const days = params.get("days") || "30";
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");

  const [data, setData] = useState<StatsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const qp = new URLSearchParams();
        if (startDate) qp.set("startDate", startDate);
        if (endDate) qp.set("endDate", endDate);
        if (!startDate && !endDate) qp.set("days", days);

        const res = await fetch(`/api/stats?${qp.toString()}`, { cache: "no-store" });
        const json = (await res.json()) as StatsApiResponse;
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
  }, [days, startDate, endDate]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.bySource || []) {
      map.set(row.source, row.count);
    }
    return map;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("sources_title", lang)}</h1>
          <p className="text-text-secondary mt-1">{t("sources_subtitle", lang)}</p>
        </div>
        <TimeRangeSelector />
      </div>

      {loading && <Loading text={t("loading_sources", lang)} />}

      {!loading && (
        <div className="space-y-4">
          {CATEGORY_MAP.map(group => (
            <Card key={group.category} className="p-5">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                {group.category}
              </h2>
              <div className="space-y-3">
                {group.sources.map(name => (
                  <SourceRow key={name} name={name} count={counts.get(name) || 0} />
                ))}
              </div>
            </Card>
          ))}

          {data && (
            <Card className="p-5">
              <p className="text-sm text-text-secondary">
                {t("label_time_range", lang)}:{" "}
                <span className="font-semibold text-text-primary">{data.timeRange.labelDe}</span>{" "}
                — {data.totalAlerts} {t("label_alerts", lang)}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function SourceRow({ name, count }: { name: string; count: number }) {
  // Create a URL-safe source parameter
  const sourceParam = encodeURIComponent(name);
  const externalUrl = SOURCE_LINKS[name];
  
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-card px-4 py-3 hover:border-primary-300 hover:bg-primary-50/30 transition-all group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-text-primary truncate group-hover:text-primary-700 font-medium inline-flex items-center gap-2 min-w-0"
            >
              <span className="truncate">{name}</span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-600 flex-shrink-0" />
            </a>
          ) : (
            <span className="text-sm text-text-primary truncate group-hover:text-primary-700 font-medium">
              {name}
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted">● {t("label_active")}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/meldungen?source=${sourceParam}`}
          className="text-sm font-semibold text-text-primary tabular-nums group-hover:text-primary-700"
        >
          {count}
        </Link>
      </div>
    </div>
  );
}


