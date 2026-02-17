// © 2025 CyberLage
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import MeldungWizard from "@/components/meldepflicht/MeldungWizard";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";
import type { Alert } from "@/types/alert";

export default function MeldepflichtClient() {
  const params = useSearchParams();
  const { lang } = useAppShell();

  const alertId = useMemo(() => params.get("alertId") || "", [params]);

  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!alertId) {
        setAlert(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("not found");
        const json = (await res.json()) as Alert;
        if (!cancelled) setAlert(json);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setAlert(null);
          setError("Could not load alert.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [alertId, lang]);

  return (
    <div className="space-y-6">
      <Link
        href={alertId ? `/meldung/${encodeURIComponent(alertId)}` : "/meldungen"}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Reporting Assistant
        </h1>
        <p className="text-text-secondary mt-1">
          Prepare an NIS2/BSIG report (AI-assisted) - CyberLage does not submit reports, it prepares a draft.
        </p>
      </div>

      {!alertId && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                No alert selected
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Open an alert and click "Prepare report" there.
              </p>
              <Link
                href="/meldungen"
                className="inline-flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800 hover:underline mt-3"
              >
                {t("nav_allAlerts", lang)}
              </Link>
            </div>
          </div>
        </Card>
      )}

      {loading && <Loading text="Loading alert..." />}

      {error && (
        <Card className="p-6">
          <p className="text-sm text-text-secondary">{error}</p>
        </Card>
      )}

      {alert && <MeldungWizard alert={alert} lang={lang} />}
    </div>
  );
}


