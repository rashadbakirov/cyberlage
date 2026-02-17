// © 2025 CyberLage
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [hasUsers, setHasUsers] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  // Prüfen, ob bereits Benutzer existieren
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/auth/setup/check");
        const data = await res.json();
        
        if (data.hasUsers) {
          setHasUsers(true);
          // Weiterleitung zum Login, falls Setup bereits abgeschlossen ist
          setTimeout(() => router.push("/auth/login"), 2000);
        }
      } catch (err) {
        console.error("Setup check failed:", err);
      } finally {
        setLoading(false);
      }
    }

    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Passwort-Abgleich prüfen
    if (formData.password !== formData.passwordConfirm) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    // Passwort-Richtlinie prüfen
    const policyCheck = validatePasswordPolicy(formData.password);
    if (!policyCheck.ok) {
      setError(policyCheck.errors.join("\n"));
      return;
    }

    setCreating(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Erstellen des Kontos");
        return;
      }

      // Erfolg – Weiterleitung zum Login
      router.push("/auth/login?setup=success");
    } catch (err) {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Prüfe Setup-Status...</p>
        </div>
      </div>
    );
  }

  if (hasUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup abgeschlossen</h1>
          <p className="text-slate-600 mb-4">
            Das System wurde bereits eingerichtet.
          </p>
          <p className="text-sm text-slate-500">
            Sie werden zur Anmeldeseite weitergeleitet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">CyberLage Ersteinrichtung</h1>
          <p className="text-slate-600 mt-2">Erstellen Sie Ihr Administrator-Konto</p>
        </div>

        {/* Setup Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              🔐 Diese Seite ist nur beim ersten Start verfügbar. Nach der Einrichtung werden weitere Benutzer über die Benutzerverwaltung angelegt.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 whitespace-pre-line">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Max Mustermann"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@cyberlage.de"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••••"
              />
              <p className="mt-1 text-xs text-slate-500">
                Mind. 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen
              </p>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-slate-700 mb-1">
                Passwort wiederholen
              </label>
              <input
                id="passwordConfirm"
                type="password"
                value={formData.passwordConfirm}
                onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Erstelle Konto..." : "Administrator-Konto erstellen"}
            </button>
          </form>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center text-xs text-slate-500">
          🔒 Alle Passwörter werden sicher mit bcrypt verschlüsselt gespeichert
        </div>
      </div>
    </div>
  );
}

