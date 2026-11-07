import { prisma } from "@/server/db";
import { InvoicePreview } from "@/components/InvoicePreview";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n-server";

export default async function NewInvoicePage() {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(user as any).profileCompleted) redirect('/onboarding');
  
  const contacts = await prisma.contact.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const contactOptions = contacts.map(c => ({ id: c.id, name: c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email }));
  
  // Fetch user's organization profile to get default VAT rate
  const orgProfile = await prisma.orgProfile.findFirst({ where: { userId: user.id } });
  const defaultVat = Number(orgProfile?.defaultVat || 0);
  return (
    <div className="space-y-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">{t("invoices.newTitle")}</h1>
      </div>
      <InvoicePreview contacts={contactOptions} defaultVat={defaultVat} plan={(user as any).plan || "FREE"} />
    </div>
  );
}
