// © 2025 CyberLage
"use client";

import Card from "@/components/ui/Card";
import { TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";

export default function TopicFilter({
  counts,
  selected,
  onToggle,
  total,
}: {
  counts: Record<string, number>;
  selected: string[];
  onToggle: (topicId: string) => void;
  total: number;
}) {
  const isSelected = (id: string) => selected.includes(id);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">{t("topics_title")}</h2>
        <span className="text-xs text-text-muted">{total}</span>
      </div>

      <div className="space-y-2">
        {TOPICS.map(topic => {
          const count = counts[topic.id] || 0;
          const active = isSelected(topic.id);
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => onToggle(topic.id)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-sm transition",
                active
                  ? "bg-primary-50 border-primary-100 text-primary-900"
                  : "bg-card border-slate-200 text-text-secondary hover:bg-hover"
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-base">{topic.icon}</span>
                <span className="truncate">{topic.labelEn || topic.label}</span>
              </span>
              <span className="text-xs tabular-nums text-text-muted">{count}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}


