import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import CustomerPortal from "@/components/CustomerPortal";

const { resolvePortalShare, customerInvoiceFilter } = require("@/lib/customer-portal.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Customer invoices · facturio.ch", robots: { index: false, follow: false } };

export default async function PublicCustomerPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await resolvePortalShare(prisma, token);
  if (!share) notFound();

  const invoices = await prisma.invoice.findMany({
    where: customerInvoiceFilter(share),
    orderBy: { issueDate: "desc" },
    select: { id: true, number: true, issueDate: true, dueDate: true, paidAt: true, status: true, currency: true, totalGross: true, paymentLinkUrl: true },
  });
  const contact = share.contact;
  const customerName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return <CustomerPortal
    token={token}
    customerName={customerName}
    companyName={contact.company || customerName}
    invoices={invoices.map((invoice) => ({ ...invoice, issueDate: invoice.issueDate.toISOString(), dueDate: invoice.dueDate?.toISOString() ?? null, paidAt: invoice.paidAt?.toISOString() ?? null, currency: invoice.currency as "CHF" | "EUR", status: invoice.status as "SENT" | "PAID" }))}
  />;
}
