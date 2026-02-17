// © 2025 CyberLage
// Hilfsfunktionen für Formatierung und UI
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function localeForLang(_lang: "de" | "en"): string {
  return "de-DE";
}

// Datum formatieren
export function formatDate(dateStr: string, lang: "de" | "en" = "de"): string {
  const date = parseIsoDate(dateStr);
  if (!date) return "—";
  return date.toLocaleDateString(localeForLang(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Datum mit Uhrzeit formatieren
export function formatDateTime(dateStr: string, lang: "de" | "en" = "de"): string {
  const date = parseIsoDate(dateStr);
  if (!date) return "—";
  return date.toLocaleDateString(localeForLang(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Relative Zeitangabe (z. B. "vor 2 Stunden")
export function timeAgo(dateStr: string, lang: "de" | "en" = "de"): string {
  const date = parseIsoDate(dateStr);
  if (!date) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatDate(dateStr, lang);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHrs < 24) return `vor ${diffHrs} Std.`;
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return formatDate(dateStr, lang);
}

// AI-Score zu Farbe
export function scoreColor(score: number | null): string {
  if (score === null) return "text-text-muted";
  if (score >= 85) return "text-severity-critical";
  if (score >= 70) return "text-severity-high";
  if (score >= 45) return "text-severity-medium";
  if (score >= 15) return "text-severity-low";
  return "text-severity-info";
}

// Text kürzen
export function truncate(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\u2026";
}


