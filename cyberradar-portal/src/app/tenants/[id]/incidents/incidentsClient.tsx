// © 2025 CyberLage
"use client";

import Card from "@/components/ui/Card";

// Tenant-specific logic disabled in public version
export default function IncidentsClient() {
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold text-text-primary">Incidents</h1>
      <p className="text-sm text-text-secondary mt-2">
        Tenant-specific incidents are not available in the public version.
      </p>
    </Card>
  );
}


