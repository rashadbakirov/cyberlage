// © 2025 CyberLage
"use client";

import React, { Suspense, createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export type UiLanguage = "en";

interface AppShellContextValue {
  lang: UiLanguage;
  setLang: (lang: UiLanguage) => void;
  toggleLang: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error("useAppShell must be used inside <AppShell />");
  }
  return value;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lang: UiLanguage = "en";
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<AppShellContextValue>(
    () => ({
      lang,
      setLang: () => {},
      toggleLang: () => {},
      mobileSidebarOpen,
      setMobileSidebarOpen,
    }),
    [lang, mobileSidebarOpen]
  );

  return (
    <AppShellContext.Provider value={value}>
      <div className="min-h-screen bg-page">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <div className="md:pl-16">
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main className="cyberlage-container px-4 md:px-8 py-6">
            {children}
          </main>
          <footer className="px-4 md:px-8 pb-6 text-xs text-text-muted">
            <div className="cyberlage-container border-t border-slate-200 pt-4">
              © 2025 CyberLage · Rashad Bakirov ·{" "}
              <a
                href="https://www.linkedin.com/in/rashadbakirov/"
                target="_blank"
                rel="noreferrer"
                className="text-primary-700 hover:text-primary-800 hover:underline"
              >
                LinkedIn
              </a>
            </div>
          </footer>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}

