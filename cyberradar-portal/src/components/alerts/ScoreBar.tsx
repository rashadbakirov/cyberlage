// © 2025 CyberLage
import { cn } from "@/lib/utils";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function colorForSeverity(severity: string | null | undefined): string {
  const v = (severity || "").toString().toLowerCase();
  if (v === "critical") return "bg-red-600";
  if (v === "high") return "bg-orange-600";
  if (v === "medium") return "bg-amber-600";
  if (v === "low") return "bg-blue-600";
  return "bg-gray-500";
}

export default function ScoreBar({
  score,
  severity,
  className,
}: {
  score: number | null;
  severity: string | null | undefined;
  className?: string;
}) {
  const pct = typeof score === "number" ? clamp(score, 0, 100) : 0;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between text-xs text-text-muted mb-2">
        <span>AI Score</span>
        <span className="font-mono tabular-nums text-text-secondary">
          {typeof score === "number" ? `${score}/100` : "—"}
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorForSeverity(severity))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}



