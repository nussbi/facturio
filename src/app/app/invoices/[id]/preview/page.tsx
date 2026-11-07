import { prisma } from "@/server/db";
import InvoiceFullPreview from "@/components/InvoiceFullPreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import SaveInvoiceButton from "@/components/SaveInvoiceButton";
import SendInvoiceButton from "@/components/SendInvoiceButton";
import InvoiceStatusDropdown from "@/components/InvoiceStatusDropdown";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n-server";
import { formatDate } from "@/lib/utils";

export default async function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(user as { profileCompleted?: boolean }).profileCompleted) redirect('/onboarding');
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({ where: { id, userId: user.id }, include: { contact: true, items: true } });
  if (!invoice) return <div className="p-6">{t("common.notFound")}</div>;
  const org = await prisma.orgProfile.findFirst({ where: { userId: user.id } });
  const displayName = invoice.contact.company || `${invoice.contact.firstName ?? ""} ${invoice.contact.lastName ?? ""}`.trim();
  // Pull change log entries related to this invoice from the contact log (by invoice number pattern)
  const logs = invoice.number != null
    ? await prisma.contactLog.findMany({
        where: { contactId: invoice.contactId, message: { contains: `Invoice #${invoice.number}` } },
        orderBy: { createdAt: "desc" }
      })
    : [];
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-lg">{t("preview.title")} • {displayName}</CardTitle>
              <InvoiceStatusDropdown 
                invoiceId={id} 
                currentStatus={invoice.status as "DRAFT" | "SENT" | "PAID" | "CANCELLED"} 
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                href="/app/invoices"
              >
                <ArrowLeft className="h-4 w-4" /> {t("common.back")}
              </Link>
              {invoice.status !== "PAID" && (
                <>
                  <SendInvoiceButton 
                    invoiceId={id} 
                    contactEmail={invoice.contact.email}
                    status={invoice.status as "DRAFT" | "SENT" | "PAID" | "CANCELLED"}
                    variant="primary"
                  />
                  <SaveInvoiceButton id={id} />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <InvoiceFullPreview invoice={invoice as any} contact={invoice.contact as any} org={org as any} />
          <div className="mt-4 flex justify-end">
            <a
              href={`/app/api/invoices/${id}/pdf?format=PDF`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t("preview.downloadPdf")}
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Change Log Section (invoice-scoped view) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("preview.changeLog")}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">{t("preview.noChanges")}</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="flex flex-col gap-1 border-b border-gray-100 last:border-0 pb-3">
                  <span className="text-sm text-gray-800">{log.message}</span>
                  <span className="text-xs text-gray-400">{formatDate(log.createdAt, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
