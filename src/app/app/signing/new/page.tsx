import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import NewSigningRequest from "@/components/NewSigningRequest";
import { getSigningT } from "@/lib/signing-copy-server";
export async function generateMetadata() { const t = await getSigningT(); return { title: `${t("newRequest")} · Facturio` }; }
export default async function NewSigningPage({ searchParams }: { searchParams: Promise<{ contactId?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getSigningT();
  const contacts = await prisma.contact.findMany({ where: { userId: user.id }, orderBy: [{ company: "asc" }, { firstName: "asc" }], select: { id: true, company: true, firstName: true, lastName: true, email: true } });
  const options = contacts.map(contact => ({ id: contact.id, label: contact.company || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email, email: contact.email }));
  return <main className="w-full space-y-5"><header><Link href="/app/signing" className="text-sm text-indigo-700">← {t("allRequests")}</Link><h1 className="mt-2 text-2xl font-semibold text-gray-900">{t("newRequest")}</h1><p className="mt-2 text-sm text-gray-500">{t("uploadIntro")}</p></header><NewSigningRequest contacts={options} initialContactId={(await searchParams).contactId || ""} /></main>;
}
