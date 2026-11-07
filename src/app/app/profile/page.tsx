import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import ProfileForm from "@/components/ProfileForm";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("profile.title")}</h1>
      </div>
      
      <ProfileForm />
    </div>
  );
}
