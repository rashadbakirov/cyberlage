// © 2025 CyberLage
import { parseIsoDate } from "@/lib/utils";

export interface TimeRange {
  start: string;
  end: string;
  labelDe: string;
  labelEn: string;
  days: number | null;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function nextUtcDayStart(date: Date): Date {
  const d = startOfUtcDay(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function resolveTimeRange(input: {
  days?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  now?: Date;
}): TimeRange {
  const now = input.now ?? new Date();

  const rawStart = (input.startDate || "").trim();
  const rawEnd = (input.endDate || "").trim();

  const startDate = rawStart ? parseIsoDate(rawStart) : null;
  let endDate = rawEnd ? parseIsoDate(rawEnd) : null;

  // If endDate is provided as YYYY-MM-DD, treat it as inclusive day → end = next day 00:00 UTC (exclusive).
  if (endDate && rawEnd && isDateOnly(rawEnd)) {
    endDate = nextUtcDayStart(endDate);
  }

  if (startDate || endDate) {
    const start = (startDate ? startOfUtcDay(startDate) : startOfUtcDay(now)).toISOString();
    const end = (endDate ?? now).toISOString();
    return {
      start,
      end,
      days: null,
      labelDe: "Custom range",
      labelEn: "Custom range",
    };
  }

  const days = typeof input.days === "number" ? input.days : 0;

  if (days === 0) {
    return {
      start: startOfUtcDay(now).toISOString(),
      end: now.toISOString(),
      days: 0,
      labelDe: "Today",
      labelEn: "Today",
    };
  }

  const start = startOfUtcDay(new Date(now.getTime() - days * 24 * 60 * 60 * 1000));
  return {
    start: start.toISOString(),
    end: now.toISOString(),
    days,
    labelDe: `${days} days`,
    labelEn: `${days} days`,
  };
}

export function previousPeriod(range: TimeRange): { start: string; end: string } {
  const start = parseIsoDate(range.start) ?? new Date();
  const end = parseIsoDate(range.end) ?? new Date();
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = start;
  const prevStart = new Date(start.getTime() - durationMs);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
}


