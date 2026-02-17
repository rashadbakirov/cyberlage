// © 2025 CyberLage
import { Suspense } from "react";
import Loading from "@/components/ui/Loading";
import ComplianceClient from "@/app/compliance/ComplianceClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ComplianceClient />
    </Suspense>
  );
}


