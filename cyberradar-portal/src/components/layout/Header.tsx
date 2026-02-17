// © 2025 CyberLage
"use client";

import { Menu, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";

function titleForPath(pathname: string, lang: Parameters<typeof t>[1]): string {
  if (pathname === "/" || pathname.startsWith("/lagebild")) return t("nav_dashboard", lang);
  if (pathname.startsWith("/meldungen")) return t("nav_allAlerts", lang);
  if (pathname.startsWith("/meldung/")) return t("nav_allAlerts", lang);
  if (pathname.startsWith("/compliance")) return t("nav_compliance", lang);
  if (pathname.startsWith("/evidence")) return t("nav_evidence", lang);
  if (pathname.startsWith("/quellen")) return t("nav_sources", lang);
  if (pathname.startsWith("/ki-analyst")) return t("nav_aiAnalyst", lang);
  if (pathname.startsWith("/einstellungen")) return t("nav_settings", lang);
  if (pathname.startsWith("/preise")) return t("pricing_title", lang);
  return t("nav_dashboard", lang);
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { lang, setMobileSidebarOpen } = useAppShell();

  const [search, setSearch] = useState("");

  const title = useMemo(() => titleForPath(pathname || "/", lang), [pathname, lang]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    const next = new URLSearchParams();
    next.set("search", query);
    router.push(`/meldungen?${next.toString()}`);
  }

  return (
    <header className="sticky top-0 z-30 bg-page/80 backdrop-blur border-b border-slate-200">
      <div className="cyberlage-container px-4 md:px-8 h-16 flex items-center gap-3">
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-hover transition"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label={t("label_menu_open", lang)}
        >
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {title}
          </p>
          <p className="text-xs text-text-muted truncate">
            {t("dashboard_subtitle", lang)}
          </p>
        </div>

        <form onSubmit={onSubmit} className="hidden sm:block w-[360px] max-w-[45vw]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("search_placeholder", lang)}
              className={cn(
                "w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-card",
                "focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600"
              )}
            />
          </div>
        </form>
      </div>
    </header>
  );
}


