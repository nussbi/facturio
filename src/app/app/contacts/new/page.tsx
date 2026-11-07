import { prisma } from "@/server/db";
import { ContactForm } from "@/components/ContactForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n-server";

export default async function NewCustomerPage() {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(user as any).profileCompleted) redirect('/onboarding');
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("contacts.addCustomer")}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("contacts.details")}</CardTitle>
          <CardDescription>{t("contacts.addDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm />
        </CardContent>
      </Card>
    </div>
  );
}
