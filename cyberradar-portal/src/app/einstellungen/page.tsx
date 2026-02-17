// © 2025 CyberLage
"use client";

import Card from "@/components/ui/Card";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function EinstellungenPage() {
  const { lang } = useAppShell();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("settings_title", lang)}</h1>
        <p className="text-text-secondary mt-1">{t("settings_subtitle", lang)}</p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-text-secondary">
          {t("settings_minimal", lang)}
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-text-secondary space-y-1">
          <li>{t("settings_opt_default_range", lang)}</li>
          <li>{t("settings_opt_notifications", lang)}</li>
          <li>{t("settings_opt_mcp", lang)}</li>
        </ul>
      </Card>

    </div>
  );
}


