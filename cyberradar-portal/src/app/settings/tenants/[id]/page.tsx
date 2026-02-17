// © 2025 CyberLage
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsTenantIdAlias(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  redirect(`/einstellungen/tenants/${encodeURIComponent(id)}`);
}


