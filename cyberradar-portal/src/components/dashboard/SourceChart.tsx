// © 2025 CyberLage
import Card from "@/components/ui/Card";

export default function SourceChart({
  sources,
  title = "Quellen",
}: {
  sources: { source: string; count: number }[];
  title?: string;
}) {
  const sorted = [...sources].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count || 1;

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        {title}
      </h2>
      <div className="space-y-3">
        {sorted.map(item => {
          const width = Math.max(6, Math.round((item.count / maxCount) * 100));
          return (
            <div key={item.source} className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-text-secondary truncate">{item.source}</p>
                  <p className="text-sm font-semibold text-text-primary tabular-nums">{item.count}</p>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-primary-700 rounded-full" style={{ width: `${width}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


