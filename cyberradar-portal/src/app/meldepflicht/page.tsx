// © 2025 CyberLage
import { Suspense } from "react";
import Loading from "@/components/ui/Loading";
import MeldepflichtClient from "@/app/meldepflicht/MeldepflichtClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MeldepflichtClient />
    </Suspense>
  );
}



