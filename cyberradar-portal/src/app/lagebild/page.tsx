// © 2025 CyberLage
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const qp = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (typeof value === "string" && value) qp.set(key, value);
    else if (Array.isArray(value)) value.filter(Boolean).forEach(v => qp.append(key, v));
  }
  const suffix = qp.toString();
  redirect(suffix ? `/?${suffix}` : "/");
}


