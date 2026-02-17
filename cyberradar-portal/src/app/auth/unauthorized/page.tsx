// © 2025 CyberLage
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="cyberlage-container py-16">
      <div className="max-w-xl mx-auto bg-card border border-slate-200 rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Zugriff nicht erforderlich
        </h1>
        <p className="mt-3 text-text-secondary">
          In der öffentlichen Version gibt es keine Rollen oder
          Authentifizierung.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
