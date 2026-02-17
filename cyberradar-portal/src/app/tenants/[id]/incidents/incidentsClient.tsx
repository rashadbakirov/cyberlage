// © 2025 CyberLage
"use client";

import Card from "@/components/ui/Card";

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export default function IncidentsClient() {
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-text-primary">Vorfälle</h1>
      <p className="text-sm text-text-secondary mt-2">
        Tenant-spezifische Vorfälle sind in der Public-Version nicht verfügbar.
      </p>
    </Card>
  );
}

