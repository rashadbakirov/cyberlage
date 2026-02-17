// © 2025 CyberLage
import { AlertTriangle, Flame, Shield, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import Card from "@/components/ui/Card";

export interface StatCardsProps {
  stats: {
    totalAlerts: number;
    bySeverity: { critical: number; high: number; medium: number; low: number; info: number };
    activelyExploited: number;
    trend?: {
      previousPeriodTotal: number;
      previousPeriodBySeverity?: { critical: number; high: number; medium: number; low: number; info: number };
      changePercent?: number;
    };
  };
  labelDe: string; // e.g. "Today"
}

function Delta({
  value,
}: {
  value: number | null;
}) {
  if (value === null) return <span className="text-xs text-text-muted">—</span>;
  if (value === 0) return <span className="text-xs text-text-muted">=</span>;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={positive ? "text-xs text-emerald-700" : "text-xs text-red-700"}>
      <span className="inline-flex items-center gap-1">
        <Icon className="w-3.5 h-3.5" />
        {positive ? `+${value}` : value}
      </span>
    </span>
  );
}

export default function StatCards({ stats, labelDe }: StatCardsProps) {
  const prevSev = stats.trend?.previousPeriodBySeverity;

  const cards = [
    {
      label: `Alerts ${labelDe.toLowerCase()}`,
      value: stats.totalAlerts,
      delta: typeof stats.trend?.previousPeriodTotal === "number" ? stats.totalAlerts - stats.trend!.previousPeriodTotal : null,
      icon: Shield,
    },
    {
      label: "Critical",
      value: stats.bySeverity.critical,
      delta: prevSev ? stats.bySeverity.critical - prevSev.critical : null,
      icon: AlertTriangle,
    },
    {
      label: "High",
      value: stats.bySeverity.high,
      delta: prevSev ? stats.bySeverity.high - prevSev.high : null,
      icon: Sparkles,
    },
    {
      label: "Medium",
      value: stats.bySeverity.medium,
      delta: prevSev ? stats.bySeverity.medium - prevSev.medium : null,
      icon: Sparkles,
    },
    {
      label: "Exploits",
      value: stats.activelyExploited,
      delta: null,
      icon: Flame,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider">
                  {card.label}
                </p>
                <p className="text-3xl font-bold mt-1 text-text-primary">
                  {card.value.toLocaleString("en-US")}
                </p>
                <div className="mt-1">
                  <Delta value={card.delta} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary-800" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}




