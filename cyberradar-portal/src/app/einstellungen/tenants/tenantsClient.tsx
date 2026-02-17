// © 2025 CyberLage
"use client";

import Card from "@/components/ui/Card";

// Tenant-spezifische Logik – in der öffentlichen Version deaktiviert
export default function TenantsClient() {
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-text-primary">Mandantenverwaltung</h1>
      <p className="text-sm text-text-secondary mt-2">
        Die Mandantenverwaltung ist in der Public-Version deaktiviert.
      </p>
    </Card>
  );
}


