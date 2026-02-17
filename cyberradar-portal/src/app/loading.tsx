// © 2025 CyberLage
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-text-on-dark">
      <div className="text-center">
        <div className="inline-flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-cyan-300 animate-pulse" />
          <span className="text-2xl font-semibold tracking-wide">CyberLage</span>
        </div>
        <p className="mt-3 text-sm text-white/70">Lade die aktuelle Cyber-Sicherheitslage…</p>
        <div className="mt-5 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      </div>
    </div>
  );
}


