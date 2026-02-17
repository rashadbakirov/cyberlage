// © 2025 CyberLage
import { Suspense } from "react";
import DashboardClient from "@/app/dashboard/DashboardClient";

export const metadata = {
  title: "Situational Overview | CyberLage",
  description: "Your daily cyber security situation - AI-assisted and compliance-ready",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700" /></div>}>
      <DashboardClient />
    </Suspense>
  );
}


