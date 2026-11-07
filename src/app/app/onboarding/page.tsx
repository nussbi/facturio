import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import ProfileForm from "@/components/ProfileForm";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const completed = (user as { profileCompleted?: boolean }).profileCompleted === true;
  if (completed) redirect("/");
  
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("onboarding.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("onboarding.subtitle")}</p>
      </div>
      
      <ProfileForm />
    </div>
  );
}
