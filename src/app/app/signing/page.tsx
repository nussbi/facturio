import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getSigningT, getSigningLanguage, signingLocale } from "@/lib/signing-copy-server";
export async function generateMetadata() { const t = await getSigningT(); return { title: `${t("title")} · Facturio` }; }
export default async function SigningListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getSigningT(); const lang = await getSigningLanguage();
  const requests = await prisma.signingEnvelope.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, documentType: true, recipientEmail: true, status: true, createdAt: true, signedAt: true, invoiceDraftId: true } });
  return <main className="w-full space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1><p className="mt-2 text-sm text-gray-500">{t("intro")}</p></div><Link href="/app/signing/new" className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">{t("newRequest")}</Link></header>
    {!requests.length ? <section className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center"><h2 className="font-semibold text-gray-900">{t("emptyTitle")}</h2><p className="mt-2 text-sm text-gray-500">{t("emptyText")}</p><Link href="/app/signing/new" className="mt-4 inline-block text-sm font-semibold text-indigo-700">{t("firstRequest")} →</Link></section> : <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr>{["document", "recipient", "status", "created"].map(key => <th key={key} className="px-4 py-3">{t(key)}</th>)}<th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-gray-100">{requests.map(request => <tr key={request.id}><td className="px-4 py-3"><div className="font-medium text-gray-900">{request.title}</div><div className="mt-1 text-xs text-gray-500">{t(request.documentType)} {request.invoiceDraftId ? `· ${t("invoiceCreated")}` : ""}</div></td><td className="px-4 py-3 text-gray-600">{request.recipientEmail}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${request.status === "SIGNED" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>{t(request.status)}</span></td><td className="px-4 py-3 text-gray-500">{new Date(request.createdAt).toLocaleDateString(signingLocale[lang])}</td><td className="px-4 py-3 text-right"><Link href={`/app/signing/${request.id}`} className="font-semibold text-indigo-700">{t("open")} →</Link></td></tr>)}</tbody></table></div>}
  </main>;
}
