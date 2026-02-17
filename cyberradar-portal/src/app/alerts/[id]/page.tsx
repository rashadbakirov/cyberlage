// © 2025 CyberLage
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AlertRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/meldung/${id}`);
}


