// © 2025 CyberLage
"use client";

import Card from "@/components/ui/Card";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default function PreisePage() {
  const { lang } = useAppShell();
  const locale: "de" = "de";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{t("pricing_heading", locale)}</h1>
        <p className="text-text-secondary mt-1">{t("pricing_subtitle", locale)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PlanCard
          locale={locale}
          title={t("pricing_plan_free", locale)}
          price="€0/Monat"
          cta={t("pricing_cta_register", locale)}
          features={[
            t("pricing_feat_weekly_digest", locale),
            t("pricing_feat_top5", locale),
            t("pricing_feat_public_sources", locale),
          ]}
        />
        <PlanCard
          locale={locale}
          title={t("pricing_plan_team", locale)}
          price="€79/Monat pro Team"
          cta={t("pricing_cta_start_pilot", locale)}
          featured
          features={[
            t("pricing_feat_daily_briefing", locale),
            t("pricing_feat_realtime_alerts", locale),
            t("pricing_feat_full_portal", locale),
            t("pricing_feat_ai_analyst", locale),
            t("pricing_feat_topic_filters", locale),
            t("pricing_feat_action_items", locale),
          ]}
        />
        <PlanCard
          locale={locale}
          title={t("pricing_plan_compliance", locale)}
          price="€149/Monat pro Team"
          cta={t("pricing_cta_contact", locale)}
          features={[
            t("pricing_feat_weekly_pdf", locale),
            t("pricing_feat_audit_log", locale),
            t("pricing_feat_nis2_dora_export", locale),
            t("pricing_feat_compliance_dashboard", locale),
            t("pricing_feat_mcp_integration", locale),
            t("pricing_feat_api_access", locale),
          ]}
        />
      </div>

      <Card className="p-6">
        <p className="text-sm text-text-secondary">
          {t("pricing_all_plans", locale)}
        </p>
      </Card>
    </div>
  );
}

function PlanCard({
  locale,
  title,
  price,
  cta,
  features,
  featured,
}: {
  locale: "de";
  title: string;
  price: string;
  cta: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <Card className={featured ? "p-6 border-primary-100" : "p-6"}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {featured && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 border border-primary-100 text-primary-900 font-semibold">
            {t("pricing_recommended", locale)}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{price}</p>

      <ul className="mt-4 space-y-2 text-sm text-text-secondary">
        {features.map(f => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>

      <button
        type="button"
        className={featured
          ? "mt-6 w-full h-11 rounded-xl bg-primary-800 text-white hover:bg-primary-700 transition text-sm font-medium"
          : "mt-6 w-full h-11 rounded-xl border border-slate-200 bg-card text-text-secondary hover:bg-hover transition text-sm font-medium"}
      >
        {cta}
      </button>
    </Card>
  );
}




