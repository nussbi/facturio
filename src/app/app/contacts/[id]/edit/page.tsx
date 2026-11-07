import { prisma } from "@/server/db";
import ContactEditForm from "@/components/ContactEditForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n-server";

export default async function ContactEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return <div className="p-6">{t("common.notFound")}</div>;
  const displayName = contact.company || `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || contact.email;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("common.edit")} {displayName}</CardTitle>
            <Link href={`/contacts/${id}`} className="text-xs px-3 py-1 rounded-md border bg-white hover:bg-gray-50">{t("common.back")}</Link>
          </div>
        </CardHeader>
        <CardContent>
          <ContactEditForm id={id} initial={contact} />
        </CardContent>
      </Card>
    </div>
  );
}
