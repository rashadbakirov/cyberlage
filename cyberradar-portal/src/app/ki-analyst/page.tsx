// © 2025 CyberLage
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, Send, User } from "lucide-react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { useAppShell } from "@/components/layout/AppShell";
import { t } from "@/lib/translations";

type ChatCitation = { alertId: string; title: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  timestamp: Date;
};

type ChatApiResponse = {
  reply?: string;
  answer?: string;
  citations?: ChatCitation[];
  sources?: Array<{ id: string; title: string }>;
};

const QUICK_PROMPTS_DE = [
  "Was ist heute passiert?",
  "Was sind die kritischsten Meldungen diese Woche?",
  "Welche NIS2-Meldepflichten bestehen aktuell?",
  "Top 5 aktiv ausgenutzte Schwachstellen",
  "Betrifft uns CVE-2026-24423?",
];


export const dynamic = "force-dynamic";

export default function KiAnalystPage() {
  const { lang } = useAppShell();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickPrompts = QUICK_PROMPTS_DE;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    setLoading(true);

    const nextUser: ChatMessage = { role: "user", content, timestamp: new Date() };
    setMessages(prev => [...prev, nextUser]);

    try {
      const conversationHistory = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationHistory }),
      });
      if (!res.ok) throw new Error("Chat-Anfrage fehlgeschlagen");
      const data = (await res.json()) as ChatApiResponse;

      const assistant: ChatMessage = {
        role: "assistant",
        content: data.reply || data.answer || "—",
        citations:
          data.citations ||
          data.sources?.map(s => ({ alertId: s.id, title: s.title })) ||
          [],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistant]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: t("chat_error", lang),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function clear() {
    setMessages([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("chat_title", lang)}</h1>
          <p className="text-text-secondary mt-1">
            {t("chat_ask", lang)}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="h-10 px-3 rounded-lg border border-slate-200 bg-card text-sm text-text-secondary hover:bg-hover transition"
          >
            {t("chat_clear", lang)}
          </button>
        )}
      </div>

      <Card className="p-4 border-slate-200 bg-primary-50">
        <p className="text-sm text-primary-900">
          ℹ️ {t("chat_data_only", lang)}
        </p>
      </Card>

      <Card className="p-0 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 300px)", minHeight: 520 }}>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-primary-800" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">{t("chat_greeting", lang)}</h2>
              <p className="text-sm text-text-secondary mt-2 max-w-md">
                {t("chat_intro", lang)}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {quickPrompts.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => send(p)}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-card text-xs text-text-secondary hover:bg-hover transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "assistant" && (
                    <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary-800" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-4 py-3 border",
                      m.role === "user"
                        ? "bg-primary-800 text-white border-primary-800"
                        : "bg-card text-text-primary border-slate-200"
                    )}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>

                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-text-muted mb-2">
                          {t("chat_sources", lang)} ({m.citations.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {m.citations.slice(0, 8).map(c => (
                            <Link
                              key={c.alertId}
                              href={`/meldung/${c.alertId}`}
                              className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-text-secondary hover:bg-hover transition max-w-64 truncate"
                            >
                              {c.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className={cn("text-xs mt-2", m.role === "user" ? "text-white/70" : "text-text-muted")}>
                      {m.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {m.role === "user" && (
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary-800" />
                  </div>
                  <div className="rounded-xl px-4 py-3 border border-slate-200 bg-card">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("chat_analyzing", lang)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
              placeholder={t("chat_placeholder", lang)}
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="h-11 px-4 rounded-xl bg-primary-800 text-white hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              aria-label={t("chat_send", lang)}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2 text-center">
            {t("chat_footer", lang)}
          </p>
        </div>
      </Card>
    </div>
  );
}


