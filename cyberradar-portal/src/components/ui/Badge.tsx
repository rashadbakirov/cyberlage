// © 2025 CyberLage
// UI badge component
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/translations";

interface BadgeProps {
  severity: string | null | undefined;
  className?: string;
  compact?: boolean;
  lang?: Locale;
}

function normalizeSeverity(value: string | null | undefined): "critical" | "high" | "medium" | "low" | "info" | "unknown" {
  const v = (value || "").trim().toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  if (v === "low") return "low";
  if (v === "info") return "info";
  if (v === "unknown") return "unknown";
  // Support legacy localized values
  if (v === "kritisch") return "critical";
  if (v === "hoch") return "high";
  if (v === "mittel") return "medium";
  if (v === "niedrig") return "low";
  return "unknown";
}

function badgeClass(severity: ReturnType<typeof normalizeSeverity>): string {
  switch (severity) {
    case "critical":
      return "bg-red-50 text-red-700 border border-red-200";
    case "high":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "medium":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "low":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "info":
      return "bg-gray-50 text-gray-600 border border-gray-200";
    default:
      return "bg-gray-50 text-gray-600 border border-gray-200";
  }
}

function labelFor(severity: ReturnType<typeof normalizeSeverity>, compact: boolean, lang: Locale): string {
  if (severity === "unknown") {
    return compact ? "UNK" : "Unknown";
  }
  const key = compact ? `sev_${severity}_short` : `sev_${severity}`;
  return t(key, lang);
}

export default function Badge({ severity, className, compact = false, lang = "en" }: BadgeProps) {
  const normalized = normalizeSeverity(severity);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        badgeClass(normalized),
        className
      )}
    >
      {labelFor(normalized, compact, lang)}
    </span>
  );
}


