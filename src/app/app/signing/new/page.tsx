import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";
import NewSigningRequest from "@/components/NewSigningRequest";

export const metadata = { title: "New signing request · Facturio" };
export default async function NewSigningPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const contacts = await prisma.contact.findMany({ where: { userId: user.id }, orderBy: [{ company: "asc" }, { firstName: "asc" }], select: { id: true, company: true, firstName: true, lastName: true, email: true } });
  const options = contacts.map((contact) => ({ id: contact.id, label: contact.company || `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || contact.email, email: contact.email }));
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
    <div><Link href="/app/signing" className="text-sm text-emerald-800">← All signing requests</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">New signing request</h1><p className="mt-1 text-sm text-gray-500">Upload a PDF, place signature fields, and send a private link.</p></div>
    <NewSigningRequest contacts={options} />
  </main>;
}
