// © 2025 CyberLage
"use client";

import Card from "@/components/ui/Card";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";

export const dynamic = "force-dynamic";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
      {children}
    </h2>
  );
}

export default function ScoreMethodPage() {
  const { lang } = useAppShell();

  const example1 = {
    titleDe: "Oracle MySQL: Multiple vulnerabilities",
    source: "BSI CERT-Bund (WID) Security Advisories",
    cvss: 7.5,
    epss: 0.94428,
    cveCount: 39,
    flags: { exploited: false, zeroday: false },
    components: { base: 25, epss: 25, threat: 0, context: 12 },
    finalScore: 62,
    reasoningDe:
      "CVSS 7.5 (high). EPSS 94.4% - very high exploitation likelihood. Widely used product. 39 CVEs.",
  };

  const example2 = {
    titleDe: "CISA adds two known exploited vulnerabilities to the catalog",
    source: "CISA Cybersecurity Advisories",
    cvss: 9.8,
    epss: 0.0922,
    flags: { exploited: true, zeroday: false },
    components: { base: 35, epss: 10, threat: 15, context: 3 },
    sumBeforeFloor: 63,
    finalScore: 85,
    noteDe: 'Because "actively exploited" is set, the floor of 85 applies.',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("score_method_title", lang)}</h1>
        <p className="text-text-secondary mt-1">{t("score_method_subtitle", lang)}</p>
      </div>

      <Card className="p-6">
        <SectionTitle>Quick explanation</SectionTitle>
        <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
          <p>
            The <span className="font-semibold text-text-primary">AI Score</span> is a{" "}
            <span className="font-semibold text-text-primary">deterministic</span> prioritization from{" "}
            <span className="font-mono">0-100</span>. It helps teams sort alerts faster (for example:
            patch first, incident verification, reporting).
          </p>
          <p>
            The score is calculated from concrete signals (CVSS, EPSS, exploit status, context) and is therefore{" "}
            <span className="font-semibold text-text-primary">reproducible</span>. AI (GPT) still generates
            summaries and compliance text, but not the score itself.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle>Signals and components</SectionTitle>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="py-2 pr-4">Component</th>
                <th className="py-2 pr-4">Range</th>
                <th className="py-2">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">Base</td>
                <td className="py-3 pr-4 font-mono">0–40</td>
                <td className="py-3">
                  Technical severity (usually from CVSS)
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">EPSS</td>
                <td className="py-3 pr-4 font-mono">0–25</td>
                <td className="py-3">
                  Exploitation probability (EPSS)
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">Threat</td>
                <td className="py-3 pr-4 font-mono">0–20</td>
                <td className="py-3">
                  Active threat signals (exploited, zero-day, breach, APT)
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">Context</td>
                <td className="py-3 pr-4 font-mono">0–15</td>
                <td className="py-3">
                  Source/product/scope (e.g. tier-1 source, critical product, many CVEs)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-text-secondary space-y-2 leading-relaxed">
          <p>
            Core formula: <span className="font-mono">Score = clamp(Base + EPSS + Threat + Context, 0, 100)</span>.
          </p>
          <p>
            Additional hard rules (floors/caps) preserve urgency:
            <span className="font-mono"> actively exploited {"->"} minimum 85</span>,
            <span className="font-mono"> zero-day {"->"} minimum 80</span>,
            <span className="font-mono"> guidance/regulatory {"->"} maximum 45</span>{" "}
            (if not actively exploited).
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle>Example (from real data)</SectionTitle>

        <div className="space-y-3 text-sm text-text-secondary">
          <div>
            <p className="text-text-primary font-semibold">
              {example1.titleDe}
            </p>
            <p className="text-xs text-text-muted">
              {example1.source} · CVSS {example1.cvss} · EPSS {(example1.epss * 100).toFixed(1)}% · {example1.cveCount}{" "}
              CVEs
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-text-muted">Base</p>
              <p className="mt-1 font-mono font-semibold text-text-primary">{example1.components.base}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-text-muted">EPSS</p>
              <p className="mt-1 font-mono font-semibold text-text-primary">{example1.components.epss}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-text-muted">Threat</p>
              <p className="mt-1 font-mono font-semibold text-text-primary">{example1.components.threat}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-text-muted">Context</p>
              <p className="mt-1 font-mono font-semibold text-text-primary">{example1.components.context}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs text-text-muted">Final</p>
              <p className="mt-1 font-mono font-semibold text-text-primary">{example1.finalScore}/100</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary">Reasoning:</span>{" "}
            {example1.reasoningDe}
          </p>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-text-primary font-semibold">
              Example with enforced floor (actively exploited)
            </p>
            <p className="text-xs text-text-muted mt-1">
              {example2.titleDe} · {example2.source} · CVSS {example2.cvss} · EPSS{" "}
              {(example2.epss * 100).toFixed(1)}%
            </p>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              <>
                Component sum: <span className="font-mono">{example2.sumBeforeFloor}</span> {"->"} Final:{" "}
                <span className="font-mono font-semibold">{example2.finalScore}/100</span>. {example2.noteDe}
              </>
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle>Important notes</SectionTitle>
        <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary leading-relaxed">
          <li>
            <span className="font-semibold text-text-primary">CVSS/EPSS</span> exists only for alerts with{" "}
            <span className="font-mono">CVE IDs</span>. Many alerts (for example Microsoft 365 updates) intentionally
            have no CVEs.
          </li>
          <li>
            The AI Score is a prioritization aid, not a guarantee of exploitation or impact. Use it
            together with context, asset relevance, and your internal risk process.
          </li>
        </ul>
      </Card>
    </div>
  );
}



