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
    titleDe: "Oracle MySQL: Mehrere Schwachstellen",
    source: "BSI CERT-Bund (WID) Sicherheitshinweise",
    cvss: 7.5,
    epss: 0.94428,
    cveCount: 39,
    flags: { exploited: false, zeroday: false },
    components: { base: 25, epss: 25, threat: 0, context: 12 },
    finalScore: 62,
    reasoningDe:
      "CVSS 7.5 (hoch). EPSS 94.4% — sehr hohes Ausnutzungsrisiko. Weit verbreitetes Produkt. 39 CVEs.",
  };

  const example2 = {
    titleDe: "CISA fügt zwei bekannte ausgenutzte Schwachstellen zum Katalog hinzu",
    source: "CISA Cybersecurity Advisories",
    cvss: 9.8,
    epss: 0.0922,
    flags: { exploited: true, zeroday: false },
    components: { base: 35, epss: 10, threat: 15, context: 3 },
    sumBeforeFloor: 63,
    finalScore: 85,
    noteDe: "Da „aktiv ausgenutzt“ gesetzt ist, greift ein Minimum von 85.",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("score_method_title", lang)}</h1>
        <p className="text-text-secondary mt-1">{t("score_method_subtitle", lang)}</p>
      </div>

      <Card className="p-6">
        <SectionTitle>Kurz erklärt</SectionTitle>
        <div className="space-y-2 text-sm text-text-secondary leading-relaxed">
          <p>
            Der <span className="font-semibold text-text-primary">AI-Score</span> ist eine{" "}
            <span className="font-semibold text-text-primary">deterministische</span> Priorisierung von{" "}
            <span className="font-mono">0–100</span>. Er hilft dabei, Meldungen schneller zu sortieren (z. B.
            Patch zuerst, Vorfallprüfung, Reporting).
          </p>
          <p>
            Der Score wird aus konkreten Signalen berechnet (CVSS, EPSS, Exploit-Status, Kontext) und ist daher{" "}
            <span className="font-semibold text-text-primary">reproduzierbar</span>. Die KI (GPT) erzeugt weiterhin
            Zusammenfassungen & Compliance-Texte — nicht den Score.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle>Signale & Komponenten</SectionTitle>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="py-2 pr-4">Komponente</th>
                <th className="py-2 pr-4">Bereich</th>
                <th className="py-2">Wofür?</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">Base</td>
                <td className="py-3 pr-4 font-mono">0–40</td>
                <td className="py-3">
                  Technische Schwere (meist aus CVSS)
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">EPSS</td>
                <td className="py-3 pr-4 font-mono">0–25</td>
                <td className="py-3">
                  Ausnutzungswahrscheinlichkeit (EPSS)
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">Threat</td>
                <td className="py-3 pr-4 font-mono">0–20</td>
                <td className="py-3">
                  Aktive Signale (Exploited, Zero‑Day, Breach, APT)
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-3 pr-4 font-semibold text-text-primary">Context</td>
                <td className="py-3 pr-4 font-mono">0–15</td>
                <td className="py-3">
                  Quelle/Produkt/Umfang (z. B. Tier‑1 Quelle, kritisches Produkt, viele CVEs)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-text-secondary space-y-2 leading-relaxed">
          <p>
            Grundformel: <span className="font-mono">Score = clamp(Base + EPSS + Threat + Context, 0, 100)</span>.
          </p>
          <p>
            Zusätzlich gibt es harte Regeln (Floors/Caps), um Dringlichkeit korrekt abzubilden:
            <span className="font-mono"> aktiv ausgenutzt → mindestens 85</span>,
            <span className="font-mono"> Zero‑Day → mindestens 80</span>,
            <span className="font-mono"> Guidance/Regulatory → maximal 45</span>{" "}
            (wenn nicht aktiv ausgenutzt).
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle>Beispiel (aus echten Daten)</SectionTitle>

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
              <p className="text-xs text-text-muted">Endwert</p>
              <p className="mt-1 font-mono font-semibold text-text-primary">{example1.finalScore}/100</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="font-semibold text-text-primary">Begründung:</span>{" "}
            {example1.reasoningDe}
          </p>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-text-primary font-semibold">
              Beispiel mit Mindestwert (aktiv ausgenutzt)
            </p>
            <p className="text-xs text-text-muted mt-1">
              {example2.titleDe} · {example2.source} · CVSS {example2.cvss} · EPSS{" "}
              {(example2.epss * 100).toFixed(1)}%
            </p>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              <>
                Summe der Komponenten: <span className="font-mono">{example2.sumBeforeFloor}</span> → Final:{" "}
                <span className="font-mono font-semibold">{example2.finalScore}/100</span>. {example2.noteDe}
              </>
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle>Wichtige Hinweise</SectionTitle>
        <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary leading-relaxed">
          <li>
            <span className="font-semibold text-text-primary">CVSS/EPSS</span> existieren nur bei Alerts mit{" "}
            <span className="font-mono">CVE-IDs</span>. Viele Meldungen (z. B. Microsoft 365 Updates) haben bewusst
            keine CVEs.
          </li>
          <li>
            Der AI-Score ist eine Priorisierungshilfe — kein Garant für Ausnutzung oder Impact. Nutzen Sie ihn
            zusammen mit Kontext, Asset-Relevanz und internen Risikoprozessen.
          </li>
        </ul>
      </Card>
    </div>
  );
}


