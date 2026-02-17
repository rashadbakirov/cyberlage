// © 2025 CyberLage
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  Clock,
  Eye,
  Link2,
  Loader2,
  MessageSquare,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { cn, formatDateTime } from "@/lib/utils";
import type { Locale } from "@/lib/translations";
import type { AlertAction, AlertStatus, AlertStatusValue } from "@/lib/audit";

type Props = {
  alertId: string;
  lang: Locale;
};

const STATUS_CONFIG: Record<
  AlertStatusValue,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  new: { label: "Neu", className: "bg-slate-50 text-slate-700 border-slate-200", Icon: Clock },
  acknowledged: { label: "Gesehen", className: "bg-blue-50 text-blue-700 border-blue-200", Icon: Eye },
  in_progress: { label: "In Bearbeitung", className: "bg-amber-50 text-amber-700 border-amber-200", Icon: Loader2 },
  resolved: { label: "Erledigt", className: "bg-green-50 text-green-700 border-green-200", Icon: CheckCircle },
  dismissed: { label: "Nicht relevant", className: "bg-slate-50 text-slate-500 border-slate-200", Icon: XCircle },
};

export default function AlertActionPanel({ alertId, lang }: Props) {
  const [status, setStatus] = useState<AlertStatus | null>(null);
  const [actions, setActions] = useState<AlertAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [comment, setComment] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [ticketRef, setTicketRef] = useState("");

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("cyberlage_user") || "";
  });
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameDraft, setNameDraft] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("cyberlage_user") || "";
  });

  const statusValue: AlertStatusValue = (status?.status as AlertStatusValue) || "new";
  const cfg = STATUS_CONFIG[statusValue] || STATUS_CONFIG.new;
  const canAcknowledge = statusValue === "new";
  const canResolve = statusValue !== "resolved" && statusValue !== "dismissed";
  const canDismiss = statusValue !== "dismissed";

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [statusRes, actionsRes] = await Promise.all([
        fetch(`/api/alert-status?alertId=${encodeURIComponent(alertId)}`, { cache: "no-store" }),
        fetch(`/api/alert-actions?alertId=${encodeURIComponent(alertId)}`, { cache: "no-store" }),
      ]);

      const statusJson = await statusRes.json();
      const actionsJson = await actionsRes.json();

      setStatus(statusJson.status || null);
      setActions(Array.isArray(actionsJson.actions) ? actionsJson.actions : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function saveUserName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    window.localStorage.setItem("cyberlage_user", trimmed);
    setUserName(trimmed);
    setNameDraft(trimmed);
    setShowNameInput(false);
  }

  async function performAction(action: string, details?: Record<string, unknown>) {
    if (!userName) {
      setShowNameInput(true);
      return;
    }

    setSending(true);
    try {
      await fetch("/api/alert-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId,
          action,
          performedBy: userName,
          details: details || {},
        }),
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  const statusLabel = useMemo(() => cfg.label, [cfg.label]);
  const StatusIcon = cfg.Icon;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            Audit & Nachweis
          </h2>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border", cfg.className)}>
              <StatusIcon className={cn("w-3.5 h-3.5", statusValue === "in_progress" && "animate-spin")} />
              {statusLabel}
            </span>

            {status?.assignedTo ? (
              <span className="text-xs text-text-secondary">
                Zugewiesen an:{" "}
                <span className="font-semibold text-text-primary">{status.assignedTo}</span>
              </span>
            ) : null}

            {status?.ticketRef ? (
              <span className="text-xs text-text-secondary">
                Ticket: <span className="font-mono text-text-primary">{status.ticketRef}</span>
              </span>
            ) : null}

            {status?.lastUpdatedAt ? (
              <span className="text-xs text-text-muted">
                Letztes Update: {formatDateTime(status.lastUpdatedAt, lang)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-xs text-text-muted inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Lade…
            </span>
          ) : null}
        </div>
      </div>

      {showNameInput || !userName ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-text-secondary">
            Für den Audit-Log benötigen wir einen Namen oder eine E-Mail-Adresse.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <input
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              placeholder="Name oder E-Mail"
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm min-w-[240px]"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  saveUserName(nameDraft);
                }
              }}
            />
            <button
              onClick={() => {
                saveUserName(nameDraft);
              }}
              className="h-10 px-4 rounded-lg bg-primary-800 text-white text-sm font-semibold hover:bg-primary-700 transition"
            >
              Speichern
            </button>
            {userName ? (
              <button
                onClick={() => setShowNameInput(false)}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm text-text-secondary hover:bg-hover transition"
              >
                Abbrechen
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
          <span className="font-mono">{userName}</span>
          <button
            onClick={() => {
              setNameDraft(userName);
              setShowNameInput(true);
            }}
            className="text-primary-700 hover:text-primary-800 hover:underline"
          >
            ändern
          </button>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Aktionen
          </p>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={Eye}
              label="Kenntnisnahme"
              onClick={() => performAction("acknowledged")}
              disabled={!canAcknowledge || sending}
              intent="primary"
            />
            <ActionButton
              icon={UserPlus}
              label="Zuweisen"
              onClick={() => {
                const to = assignTo.trim();
                if (!to) return;
                void performAction("assigned", { assignedTo: to });
                setAssignTo("");
              }}
              disabled={sending || !assignTo.trim()}
            />
            <ActionButton
              icon={CheckCircle}
              label="Erledigt"
              onClick={() => performAction("status_changed", { newStatus: "resolved" })}
              disabled={!canResolve || sending}
            />
            <ActionButton
              icon={XCircle}
              label="Nicht relevant"
              onClick={() => performAction("dismissed")}
              disabled={!canDismiss || sending}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-text-muted mb-1">Zuweisen an</p>
              <input
                value={assignTo}
                onChange={e => setAssignTo(e.target.value)}
                placeholder="Name / Team"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm"
              />
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Ticket-Referenz</p>
              <div className="flex gap-2">
                <input
                  value={ticketRef}
                  onChange={e => setTicketRef(e.target.value)}
                  placeholder="z. B. JIRA-123"
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm"
                />
                <button
                  onClick={() => {
                    const ref = ticketRef.trim();
                    if (!ref) return;
                    void performAction("ticket_created", { ticketRef: ref });
                    setTicketRef("");
                  }}
                  disabled={!ticketRef.trim() || sending}
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-text-secondary hover:bg-hover disabled:opacity-40 transition"
                  title="Ticket speichern"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Kommentar
          </p>

          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-text-muted" />
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Kommentar hinzufügen…"
              className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm"
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const c = comment.trim();
                  if (!c) return;
                  void performAction("comment_added", { comment: c });
                  setComment("");
                }
              }}
            />
            <button
              onClick={() => {
                const c = comment.trim();
                if (!c) return;
                void performAction("comment_added", { comment: c });
                setComment("");
              }}
              disabled={!comment.trim() || sending}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-text-secondary hover:bg-hover disabled:opacity-40 transition"
              title="Kommentar senden"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {status?.notes ? (
            <p className="mt-3 text-xs text-text-muted">
              Letzte Notiz:{" "}
              <span className="text-text-secondary">{status.notes}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={() => setShowHistory(s => !s)}
          className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition"
        >
          <ChevronDown className={cn("w-4 h-4 transition", showHistory && "rotate-180")} />
          {`Audit-Log (${actions.length})`}
        </button>

        {showHistory ? (
          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {actions.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">Noch keine Aktionen.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {actions.map(a => (
                  <div key={a.id} className="p-3 text-sm flex items-start gap-3">
                    <span className="text-xs text-text-muted font-mono whitespace-nowrap pt-0.5">
                      {formatDateTime(a.performedAt, lang)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-text-secondary">
                        <span className="font-semibold text-text-primary">{a.performedBy}</span>{" "}
                        <span className="text-text-muted">—</span>{" "}
                        {formatActionLabel(a.action, a.details)}
                      </p>
                      {a.metadata?.ipAddress || a.metadata?.userAgent ? (
                        <p className="text-[11px] text-text-muted mt-1">
                          {a.metadata?.ipAddress ? <span className="font-mono">{a.metadata.ipAddress}</span> : null}
                          {a.metadata?.ipAddress && a.metadata?.userAgent ? <span> · </span> : null}
                          {a.metadata?.userAgent ? <span className="truncate inline-block max-w-[540px] align-bottom">{a.metadata.userAgent}</span> : null}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  intent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  intent?: "primary" | "default";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-10 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2 border transition disabled:opacity-40",
        intent === "primary"
          ? "bg-primary-800 text-white border-primary-800 hover:bg-primary-700"
          : "bg-white text-text-secondary border-slate-200 hover:bg-hover"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function formatActionLabel(action: string, details: Record<string, unknown>): string {
  function pick(key: string): string | null {
    const v = details[key];
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed ? trimmed : null;
  }

  if (action === "acknowledged") return "Kenntnisnahme";
  if (action === "assessed") return "Bewertet";
  if (action === "assigned") {
    const who = pick("assignedTo") || "?";
    return `Zugewiesen an ${who}`;
  }
  if (action === "status_changed") {
    const ns = pick("newStatus") || "?";
    return `Status → ${ns}`;
  }
  if (action === "comment_added") {
    const c = pick("comment") || "";
    return `Kommentar: "${c}"`;
  }
  if (action === "dismissed") return "Als nicht relevant markiert";
  if (action === "ticket_created") {
    const ref = pick("ticketRef") || "?";
    return `Ticket: ${ref}`;
  }
  if (action === "evidence_exported") return "Nachweispaket exportiert";
  if (action === "board_reported") return "In Vorstandsbericht aufgenommen";
  if (action === "meldung_started") return "Meldepflicht-Workflow gestartet";

  return action;
}


