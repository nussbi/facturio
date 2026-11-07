import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import PdfDocumentCanvas from "@/components/PdfDocumentCanvas";
import SigningActions from "@/components/SigningActions";

export default async function SigningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const request = await prisma.signingEnvelope.findFirst({ where: { id, userId: user.id }, include: { contact: { select: { company: true, firstName: true, lastName: true } } } });
  if (!request) notFound();
  let fields: any[] = [];
  try { fields = JSON.parse(request.fieldsJson); } catch { notFound(); }
  const contactLabel = request.contact?.company || `${request.contact?.firstName || ""} ${request.contact?.lastName || ""}`.trim() || request.contactId || "No customer linked";
  return <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
    <div><Link href="/app/signing" className="text-sm text-emerald-800">← All signing requests</Link><h1 className="mt-2 text-2xl font-bold text-gray-900">{request.title}</h1><p className="mt-1 text-sm text-gray-500">{request.originalFileName} · {request.pageCount} page{request.pageCount === 1 ? "" : "s"} · {request.documentType.toLowerCase()}</p></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 rounded-xl bg-gray-50 p-3 sm:p-5"><PdfDocumentCanvas url={`/app/api/signing/${encodeURIComponent(request.id)}/document`} fields={request.status === "SIGNED" ? [] : fields} /></section>
      <aside className="h-fit space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <div><h2 className="font-semibold text-gray-900">Request details</h2><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-xs text-gray-500">Recipient</dt><dd>{request.recipientEmail}</dd></div><div><dt className="text-xs text-gray-500">Customer</dt><dd>{contactLabel}</dd></div><div><dt className="text-xs text-gray-500">Status</dt><dd>{request.status === "SIGNED" ? `Signed${request.signerName ? ` by ${request.signerName}` : ""}` : request.status === "SENT" ? "Awaiting signature" : request.status}</dd></div>{request.signedAt && <div><dt className="text-xs text-gray-500">Signed at</dt><dd>{new Date(request.signedAt).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" })}</dd></div>}</dl></div>
        <SigningActions id={request.id} initialStatus={request.status} documentType={request.documentType} extractedData={request.extractedDataJson} initialInvoiceId={request.invoiceDraftId} />
        {request.status === "DRAFT" && <p className="text-xs text-gray-500">The document is private until you send it. The recipient link expires after 14 days.</p>}
        {request.status === "SIGNED" && <p className="text-xs text-gray-500">The signed PDF is stored privately. Only your account and this signing link can access it.</p>}
      </aside>
    </div>
  </main>;
}
