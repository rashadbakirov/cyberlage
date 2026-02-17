// © 2025 CyberLage
"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatDraftAsText, type MeldungDraft } from "@/lib/meldepflicht";
import type { Locale } from "@/lib/translations";
import type { Alert } from "@/types/alert";

type Props = {
  alert: Alert;
  draft: MeldungDraft;
  lang: Locale;
};

export default function MeldungDraftView({ draft, lang }: Props) {
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => formatDraftAsText(draft, lang), [draft, lang]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              BSI Report Draft
            </p>
            <p className="text-xs text-text-muted">
              Please review and complete - no automatic submission.
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="h-9 px-3 rounded-lg border border-slate-200 bg-card text-xs text-text-secondary hover:bg-hover transition inline-flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            Copy
          </button>
        </div>

        <pre className="p-5 text-xs whitespace-pre-wrap font-mono text-text-secondary leading-relaxed">
          {text}
        </pre>
      </Card>

      <p className="text-xs text-text-muted leading-relaxed">
        CyberLage prepares a draft from alert data. You remain responsible for legal reporting obligations and factual correctness.
      </p>
    </div>
  );
}



