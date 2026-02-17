// © 2025 CyberLage
import { Suspense } from "react";
import Loading from "@/components/ui/Loading";
import QuellenClient from "@/app/quellen/QuellenClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <QuellenClient />
    </Suspense>
  );
}


