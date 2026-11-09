import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import PdfDocumentCanvas from "@/components/PdfDocumentCanvas";
import SigningActions from "@/components/SigningActions";
import { getSigningT, getSigningLanguage, signingLocale } from "@/lib/signing-copy-server";
export default async function SigningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  const { id } = await params;
  const request = await prisma.signingEnvelope.findFirst({ where: { id, userId: user.id }, include: { contact: { select: { company: true, firstName: true, lastName: true } } } });
  if (!request) notFound();
  const t = await getSigningT(); const lang = await getSigningLanguage();
  let fields: any[] = []; try { fields = JSON.parse(request.fieldsJson); } catch { notFound(); }
  const contactLabel = request.contact?.company || [request.contact?.firstName, request.contact?.lastName].filter(Boolean).join(" ") || t("noCustomer");
  return <main className="w-full space-y-5"><header><Link href="/app/signing" className="text-sm text-indigo-700">← {t("allRequests")}</Link><h1 className="mt-2 text-2xl font-semibold text-gray-900">{request.title}</h1><p className="mt-2 text-sm text-gray-500">{request.originalFileName} · {t("pageCount", { count: request.pageCount })} · {t(request.documentType)}</p></header><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="min-w-0"><PdfDocumentCanvas url={`/app/api/signing/${encodeURIComponent(id)}/document`} fields={request.status === "SIGNED" ? [] : fields} /></section><aside className="h-fit space-y-5 rounded-xl border border-gray-200 bg-white p-5"><section><h2 className="font-semibold text-gray-900">{t("details")}</h2><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-gray-500">{t("recipient")}</dt><dd className="break-all">{request.recipientEmail}</dd></div><div><dt className="text-xs text-gray-500">{t("customer")}</dt><dd>{contactLabel}</dd></div><div><dt className="text-xs text-gray-500">{t("status")}</dt><dd>{request.status === "SIGNED" && request.signerName ? t("signedBy", { name: request.signerName }) : t(request.status)}</dd></div>{request.signedAt && <div><dt className="text-xs text-gray-500">{t("signedAt")}</dt><dd>{new Date(request.signedAt).toLocaleString(signingLocale[lang])}</dd></div>}</dl></section><SigningActions id={id} initialStatus={request.status} documentType={request.documentType} extractedData={request.extractedDataJson} initialInvoiceId={request.invoiceDraftId} /><p className="text-xs text-gray-500">{t(request.status === "SIGNED" ? "signedPrivate" : "draftPrivate")}</p></aside></div></main>;
}
