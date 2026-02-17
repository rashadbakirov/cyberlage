// © 2025 CyberLage
"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Scale } from "lucide-react";
import { t, type Locale } from "@/lib/translations";

type ComplianceData = {
  yes: number;
  conditional: number;
  reportingRequired: number;
};

type Props = {
  compliance: {
    nis2: ComplianceData;
    dora: ComplianceData;
    gdpr: ComplianceData;
  };
  totalAlerts: number;
  lang: Locale;
  timeQuery?: string; // e.g. "days=0" or "startDate=...&endDate=..."
};

const FRAMEWORKS = [
  {
    id: "nis2",
    label: "NIS2",
    color: "border-blue-200 bg-blue-50/60 hover:bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    warningColor: "text-blue-700",
    icon: "🏛️",
  },
  {
    id: "dora",
    label: "DORA",
    color: "border-purple-200 bg-purple-50/60 hover:bg-purple-50",
    badge: "bg-purple-100 text-purple-800",
    warningColor: "text-purple-700",
    icon: "🏦",
  },
  {
    id: "gdpr",
    label: "GDPR",
    color: "border-green-200 bg-green-50/60 hover:bg-green-50",
    badge: "bg-green-100 text-green-800",
    warningColor: "text-green-700",
    icon: "🔐",
  },
] as const;

function withQuery(path: string, timeQuery?: string): string {
  if (!timeQuery) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}${timeQuery}`;
}

export default function ComplianceStrip({ compliance, totalAlerts, lang, timeQuery }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary-700" />
          <h3 className="text-lg font-semibold text-gray-900">{t("compliance_strip_title", lang)}</h3>
        </div>
        <Link
          href={withQuery("/compliance", timeQuery)}
          className="text-sm text-primary-700 hover:text-primary-800 font-medium"
        >
          {t("compliance_all_details", lang)} <ChevronRight className="w-4 h-4 inline" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FRAMEWORKS.map(fw => {
          const data = compliance[fw.id];
          const relevantTotal = data.yes + data.conditional;
          const reporting = data.reportingRequired;

          return (
            <Link
              key={fw.id}
              href={withQuery(`/compliance?framework=${fw.id}`, timeQuery)}
              className={`rounded-xl border p-4 transition ${fw.color}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{fw.icon}</span>
                  <span className="font-semibold text-gray-900">{fw.label}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${fw.badge}`}>
                  {t("compliance_details", lang)} →
                </span>
              </div>

              {totalAlerts === 0 ? (
                <p className="text-sm text-gray-500 italic">{t("compliance_no_hits", lang)}</p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900 tabular-nums">{relevantTotal}</span>{" "}
                    {t("compliance_relevant_total", lang)}
                  </p>

                  {reporting > 0 ? (
                    <p className={`text-sm font-medium ${fw.warningColor} flex items-center gap-1`}>
                      <AlertTriangle className="w-4 h-4" />
                      <span className="tabular-nums">{reporting}</span> {t("compliance_reporting_required", lang)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      <span className="tabular-nums">0</span> {t("compliance_reporting_required", lang)}
                    </p>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


