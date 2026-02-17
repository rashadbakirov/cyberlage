// © 2025 CyberLage
import Link from "next/link";
import Card from "@/components/ui/Card";

export default function ComplianceSummary({
  compliance,
  daysLabelDe,
}: {
  compliance: {
    nis2: { yes: number; conditional: number; reportingRequired: number };
    dora: { yes: number; conditional: number; reportingRequired: number };
    gdpr: { yes: number; conditional: number; reportingRequired: number };
  };
  daysLabelDe: string;
}) {
  const items = [
    { id: "nis2", label: "NIS2", data: compliance.nis2 },
    { id: "dora", label: "DORA", data: compliance.dora },
    { id: "gdpr", label: "DSGVO", data: compliance.gdpr },
  ] as const;

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-text-primary mb-4">
        Compliance-Übersicht <span className="text-sm text-text-muted">({daysLabelDe})</span>
      </h2>

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">{item.label}</p>
              <Link href={`/compliance?framework=${item.id}`} className="text-xs text-primary-700 hover:text-primary-800">
                Details →
              </Link>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-text-muted">Meldepflichtig</p>
                <p className="text-text-primary font-semibold tabular-nums">{item.data.reportingRequired}</p>
              </div>
              <div>
                <p className="text-text-muted">Relevant</p>
                <p className="text-text-primary font-semibold tabular-nums">{item.data.yes}</p>
              </div>
              <div>
                <p className="text-text-muted">Bedingt</p>
                <p className="text-text-primary font-semibold tabular-nums">{item.data.conditional}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}



