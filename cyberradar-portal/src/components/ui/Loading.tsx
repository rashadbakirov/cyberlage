// © 2025 CyberLage
// UI: Ladezustand
import { Loader2 } from "lucide-react";

export default function Loading({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 text-primary-700 animate-spin" />
      {text ? <p className="text-text-secondary text-sm">{text}</p> : null}
    </div>
  );
}


