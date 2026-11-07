import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n-server";
import LogoutButton from "@/components/LogoutButton";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import BillingCard from "@/components/BillingCard";
import InstallAppButton from "@/components/InstallAppButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ upgrade?: string }> }) {
  const params = await searchParams;
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const created = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt as any);
  const plan = (user as any).plan || "FREE";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("settings.title")}</h1>

      <BillingCard plan={plan} autoUpgrade={params?.upgrade === "pro"} />

      <div className="rounded-lg border p-4 bg-white">
        <div className="text-xs text-muted-foreground mb-1">{t("settings.accountCreated")}</div>
        <div className="text-base font-medium">{formatDate(created)}</div>
      </div>

      <Link
        href="/profile"
        className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
      >
        <div>
          <div className="text-sm font-medium">{t("nav.myDetails")}</div>
          <div className="text-xs text-muted-foreground">{t("settings.manageDetails")}</div>
        </div>
        <span className="text-blue-600 text-lg leading-none">→</span>
      </Link>

      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm font-medium mb-4">{t("settings.getApp")}</div>
        <InstallAppButton />
      </div>

      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm font-medium mb-4">{t("settings.changePassword")}</div>
        <ChangePasswordForm />
      </div>

      <div className="rounded-lg border p-4 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">{t("nav.logout")}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
