// © 2025 CyberLage
import { Suspense } from "react";
import Loading from "@/components/ui/Loading";
import AlertsClient from "@/app/meldungen/MeldungenClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AlertsClient />
    </Suspense>
  );
}



