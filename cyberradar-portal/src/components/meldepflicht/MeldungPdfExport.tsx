// © 2025 CyberLage
"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { Locale } from "@/lib/translations";
import { formatDraftAsText, type MeldungDraft } from "@/lib/meldepflicht";
import { cn } from "@/lib/utils";

type Props = {
  draft: MeldungDraft;
  lang: Locale;
};

export default function MeldungPdfExport({ draft, lang }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

      const text = formatDraftAsText(draft, lang);
      const rawLines = text.split(/\r?\n/);

      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontSize = 10;

      const margin = 40;
      const lineHeight = 14;
      const maxWidth = 520;

      let page = pdf.addPage();
      let { width, height } = page.getSize();
      let y = height - margin;

      const drawLine = (line: string) => {
        if (y < margin + lineHeight) {
          page = pdf.addPage();
          ({ width, height } = page.getSize());
          y = height - margin;
        }
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      };

      const usableWidth = Math.min(width - margin * 2, maxWidth);

      for (const raw of rawLines) {
        const line = raw.length ? raw : " ";
        const wrapped = wrapLine(line, usableWidth, font, fontSize);
        for (const part of wrapped) drawLine(part);
      }

      const bytes = await pdf.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bsi-meldung-${draft.alertId}-${draft.phase}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className={cn(
        "h-9 px-3 rounded-lg border text-xs transition inline-flex items-center gap-2",
        busy
          ? "bg-slate-200 border-slate-200 text-slate-500 cursor-not-allowed"
          : "bg-card border-slate-200 text-text-secondary hover:bg-hover"
      )}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      PDF
    </button>
  );
}

function wrapLine(
  line: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number
): string[] {
  const text = line.replace(/\t/g, "  ");
  if (!text.trim()) return [" "];

  // Fast path: already fits
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) return [text];

  const words = text.split(" ");
  const out: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) out.push(current);
    current = "";

    // Word is too long: hard-break by characters
    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        const cand = chunk + ch;
        if (font.widthOfTextAtSize(cand, fontSize) <= maxWidth) chunk = cand;
        else {
          if (chunk) out.push(chunk);
          chunk = ch;
        }
      }
      if (chunk) out.push(chunk);
      continue;
    }

    current = word;
  }

  if (current) out.push(current);
  return out.length ? out : [" "];
}


