// © 2025 CyberLage
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bell,
  Scale,
  ShieldAlert,
  FileCheck,
  Database,
  MessageSquare,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";
import { useAppShell } from "@/components/layout/AppShell";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", labelKey: "nav_dashboard", icon: LayoutDashboard },
  { href: "/meldungen", labelKey: "nav_allAlerts", icon: Bell },
  { href: "/compliance", labelKey: "nav_compliance", icon: Scale },
  { href: "/meldepflicht", labelKey: "nav_meldepflicht", icon: ShieldAlert },
  { href: "/evidence", labelKey: "nav_evidence", icon: FileCheck, hidden: true },
  { href: "/quellen", labelKey: "nav_sources", icon: Database },
  { href: "/ki-analyst", labelKey: "nav_aiAnalyst", icon: MessageSquare },
  { href: "/einstellungen", labelKey: "nav_settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/lagebild");
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const { lang, mobileSidebarOpen, setMobileSidebarOpen } = useAppShell();

  const content = (
    <div className="h-full flex flex-col">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-text-on-dark font-semibold">
          ⬡
        </div>
        <div className="min-w-0 hidden md:group-hover:block">
          <p className="text-sm font-semibold text-text-on-dark truncate">
            CyberLage
          </p>
          <p className="text-xs text-white/70 truncate">
            Cyber situational awareness
          </p>
        </div>
      </div>

      <nav className="px-2 py-3 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {NAV.filter(item => !item.hidden).map(item => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                  "text-white/80 hover:text-white hover:bg-white/10",
                  active && "bg-white/15 text-white"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden md:group-hover:block">
                  {t(item.labelKey, lang)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-white/10">
        <p className="text-xs text-white/50 px-3 hidden md:group-hover:block">
          v3.1
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop/Tablet sidebar (collapsible on md) */}
      <aside
        className={cn(
          "hidden md:block fixed inset-y-0 left-0 z-40 bg-sidebar text-text-on-dark",
          "md:w-16 md:hover:w-[260px] transition-[width] duration-200 ease-out",
          "group"
        )}
      >
        {content}
      </aside>

      {/* Mobile overlay sidebar */}
      <div className={cn("md:hidden", mobileSidebarOpen ? "block" : "hidden")}>
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
        <aside className="fixed inset-y-0 left-0 w-[260px] bg-sidebar text-text-on-dark z-50">
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-text-on-dark font-semibold">
                ⬡
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-on-dark truncate">
                  CyberLage
                </p>
                <p className="text-xs text-white/70 truncate">
                  Cyber situational awareness
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition"
              aria-label={t("label_menu_close", lang)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {content}
        </aside>
      </div>
    </>
  );
}
