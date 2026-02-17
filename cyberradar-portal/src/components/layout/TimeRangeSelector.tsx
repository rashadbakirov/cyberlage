// © 2025 CyberLage
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
const PRESETS = [
  { days: 0, label: "Heute" },
  { days: 7, label: "7 Tage" },
  { days: 30, label: "30 Tage" },
] as const;

function formatDateLabel(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function TimeRangeSelector() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const params = useSearchParams();

  const daysParam = params.get("days");
  const startDateParam = params.get("startDate");
  const endDateParam = params.get("endDate");

  const isCustom = !!startDateParam || !!endDateParam;
  const days = daysParam ? Number.parseInt(daysParam, 10) : 0;

  const [customOpen, setCustomOpen] = useState(() => isCustom);
  const [customStart, setCustomStart] = useState(() => startDateParam || "");
  const [customEnd, setCustomEnd] = useState(() => endDateParam || "");

  const nowLabel = useMemo(() => {
    return formatDateLabel(new Date(), "en-US");
  }, []);

  function setQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page"); // reset pagination on range change
    router.push(`${pathname}?${next.toString()}`);
  }

  function selectPreset(presetDays: number) {
    setCustomOpen(false);
    setQuery({
      days: String(presetDays),
      startDate: null,
      endDate: null,
    });
  }

  function toggleCustom() {
    if (!customOpen) {
      setCustomStart(startDateParam || "");
      setCustomEnd(endDateParam || "");
    }
    setCustomOpen(o => !o);
  }

  function applyCustom() {
    setQuery({
      days: null,
      startDate: customStart || null,
      endDate: customEnd || null,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border border-slate-200 bg-card p-1">
        {PRESETS.map(p => {
          const active = !isCustom && days === p.days;
          return (
            <button
              key={p.days}
              type="button"
              onClick={() => selectPreset(p.days)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition",
                active
                  ? "bg-primary-100 text-primary-900"
                  : "text-text-secondary hover:bg-hover"
              )}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={toggleCustom}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition",
            isCustom ? "bg-primary-100 text-primary-900" : "text-text-secondary hover:bg-hover"
          )}
        >
          Zeitraum…
        </button>
      </div>

      <div className="text-sm text-text-muted">
        {nowLabel}
      </div>

      {customOpen && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Von
            </label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">
              Bis
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600"
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            className="h-10 px-4 rounded-lg bg-primary-800 text-white text-sm font-medium hover:bg-primary-700 transition"
          >
            Anwenden
          </button>
        </div>
      )}
    </div>
  );
}



