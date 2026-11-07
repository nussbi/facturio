import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

export const metadata = { title: "Signing requests · Facturio" };
const labels: Record<string, string> = { DRAFT: "Draft", SENT: "Awaiting signature", SIGNED: "Signed", DECLINED: "Declined", EXPIRED: "Expired" };
export default async function SigningListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const requests = await prisma.signingEnvelope.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, documentType: true, recipientEmail: true, status: true, createdAt: true, signedAt: true, invoiceDraftId: true } });
  return <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900">Sign documents</h1><p className="mt-1 text-sm text-gray-500">Upload PDFs, place signing fields, and track responses.</p></div><Link href="/app/signing/new" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">New signing request</Link></header>
    {requests.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center"><h2 className="font-semibold text-gray-900">No signing requests yet</h2><p className="mt-2 text-sm text-gray-500">Send a quote, agreement, or other PDF for signature.</p><Link href="/app/signing/new" className="mt-4 inline-block text-sm font-semibold text-emerald-800">Create your first request →</Link></div> : <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Document</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-gray-100">{requests.map((request) => <tr key={request.id}><td className="px-4 py-3"><div className="font-medium text-gray-900">{request.title}</div><div className="mt-1 text-xs text-gray-500">{request.documentType.toLowerCase()} {request.invoiceDraftId ? "· invoice draft created" : ""}</div></td><td className="px-4 py-3 text-gray-600">{request.recipientEmail}</td><td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{labels[request.status] || request.status}</span></td><td className="px-4 py-3 text-gray-500">{new Date(request.createdAt).toLocaleDateString("en-GB")}</td><td className="px-4 py-3 text-right"><Link href={`/app/signing/${request.id}`} className="font-semibold text-emerald-800">Open →</Link></td></tr>)}</tbody></table></div>}
  </main>;
}
