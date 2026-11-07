import { prisma } from "@/server/db";
import ContactEditForm from "@/components/ContactEditForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Link from "next/link";
import { formatSwissNumber, formatDate } from "@/lib/utils";
import { FileText, Clock, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import PortalShareButton from "@/components/PortalShareButton";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id } });
  if (!contact) return <div className="p-6">Not found</div>;
  const logs = await prisma.contactLog.findMany({ where: { contactId: id }, orderBy: { createdAt: "desc" } });
  const invoices = await prisma.invoice.findMany({ where: { contactId: id, userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 });

  const displayName = contact.company || `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || contact.email;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{displayName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Name</div>
              <div className="font-medium">{displayName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div className="font-medium">{contact.email}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500">Address</div>
              <div className="font-medium">
                {contact.street}{contact.street2 ? `, ${contact.street2}` : ""}
              </div>
              <div className="font-medium">{contact.zipCode} {contact.place}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Telephone</div>
              <div className="font-medium">{contact.telephoneFix || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mobile</div>
              <div className="font-medium">{contact.mobile || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Country</div>
              <div className="font-medium">{contact.country}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Currency</div>
              <div className="font-medium">{contact.currency}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500">IBAN</div>
              <div className="font-medium">{contact.iban || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer portal</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600">Create a private link so this customer can view their sent invoices, payment status, and PDFs without an account.</p>
          <PortalShareButton contactId={contact.id} />
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-sm text-gray-600">No invoices yet.</div>
          ) : (
            <div className="divide-y">
              {invoices.map(inv => {
                const statusConfig = {
                  DRAFT: { icon: FileText, color: "text-gray-700", bg: "bg-gray-100", label: "Draft" },
                  SENT: { icon: Clock, color: "text-yellow-700", bg: "bg-yellow-100", label: "Sent" },
                  PAID: { icon: CheckCircle, color: "text-green-700", bg: "bg-green-100", label: "Paid" },
                  CANCELLED: { icon: AlertCircle, color: "text-red-700", bg: "bg-red-100", label: "Cancelled" },
                };
                const config = statusConfig[inv.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                const Icon = config.icon;
                
                return (
                  <Link 
                    key={inv.id} 
                    href={`/app/invoices/${inv.id}/preview`}
                    className="group flex items-center justify-between py-3 px-3 rounded-lg hover:bg-blue-50/70 transition-colors border border-transparent hover:border-blue-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} shrink-0`}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </div>
                      <span className="text-sm text-gray-600 group-hover:text-blue-700 truncate">
                        {formatDate(inv.createdAt)}
                        {inv.number && <span className="ml-2 font-medium">• #{inv.number}</span>}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-semibold shrink-0">
                      {formatSwissNumber(Number(inv.totalGross))} {inv.currency}
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-sm text-gray-600">No changes recorded.</div>
          ) : (
            <ul className="space-y-3">
              {logs.map(l => (
                <li key={l.id} className="flex flex-col gap-1 border-b border-gray-100 last:border-0 pb-3">
                  <span className="text-sm text-gray-800">{l.message}</span>
                  <span className="text-xs text-gray-400">{formatDate(l.createdAt, true)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

