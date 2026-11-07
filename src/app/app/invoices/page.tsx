import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn, formatSwissNumber } from "@/lib/utils";
import { FileText, Clock, CheckCircle, AlertCircle, Download } from "lucide-react";
import InvoiceStatusDropdown from "@/components/InvoiceStatusDropdown";
import { getServerT } from "@/lib/i18n-server";

function StatusIndicator({ status }: { status: "DRAFT" | "SENT" | "PAID" | "CANCELLED" }) {
  const config = {
    DRAFT: { icon: FileText, color: "text-gray-500", bg: "bg-gray-100", label: "Draft" },
    SENT: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", label: "Sent" },
    PAID: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Paid" },
    CANCELLED: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Cancelled" },
  };
  
  const { icon: Icon, color, bg, label } = config[status] || config.DRAFT;
  
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium", bg, color)}>
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(user as { profileCompleted?: boolean }).profileCompleted) redirect('/onboarding');
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const take = 10;
  const whereAny: Array<Record<string, unknown>> = [];
  if (q) {
    whereAny.push({ reference: { contains: q } });
    whereAny.push({ contact: { company: { contains: q } } });
    whereAny.push({ contact: { firstName: { contains: q } } });
    whereAny.push({ contact: { lastName: { contains: q } } });
    whereAny.push({ contact: { email: { contains: q } } });
  }
  const from = sp.from ? new Date(sp.from) : null;
  const to = sp.to ? new Date(sp.to) : null;
  const where: Record<string, unknown> = { userId: user.id };
  if (whereAny.length) where.OR = whereAny;
  if (from || to) where.createdAt = { ...(from?{ gte: from }:{}), ...(to?{ lte: to }:{} ) };
  const statusParam = (sp.status || "").toUpperCase();
  const allowedStatus = ["DRAFT","SENT","PAID","CANCELLED"];
  if (allowedStatus.includes(statusParam)) where.status = statusParam;

  const total = await prisma.invoice.count({ where });
  const totalAll = await prisma.invoice.count({ where: { userId: user.id } });
  const totalDraft = await prisma.invoice.count({ where: { userId: user.id, status: "DRAFT" } });
  const totalSent = await prisma.invoice.count({ where: { userId: user.id, status: "SENT" } });
  const totalPaid = await prisma.invoice.count({ where: { userId: user.id, status: "PAID" } });
  const totalCancelled = await prisma.invoice.count({ where: { userId: user.id, status: "CANCELLED" } });
  const invoices = await prisma.invoice.findMany({ where, orderBy: { createdAt: "desc" }, include: { contact: true }, skip: (page-1)*take, take });
  const start = total === 0 ? 0 : (page - 1) * take + 1;
  const end = Math.min(page * take, total);
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page * take < total ? page + 1 : null;

  const currentStatus = statusParam || "ALL";

  const totalPages = Math.max(1, Math.ceil(total / take));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (statusParam) params.set("status", statusParam.toLowerCase());
    if (q) params.set("q", q);
    if (from) params.set("from", from.toISOString().slice(0, 10));
    if (to) params.set("to", to.toISOString().slice(0, 10));
    const qs = params.toString();
    return `/app/invoices${qs ? `?${qs}` : ""}`;
  };
  const pageNumbers: (number | "...")[] = [];
  const delta = 1;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
      pageNumbers.push(p);
    } else if (pageNumbers[pageNumbers.length - 1] !== "...") {
      pageNumbers.push("...");
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("invoices.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("invoices.subtitle")}</p>
        </div>
      </div>
      
      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={currentStatus === "ALL" ? "default" : "outline"} size="sm" asChild>
          <Link href="/app/invoices">{t("status.all")} ({totalAll})</Link>
        </Button>
        <Button variant={currentStatus === "DRAFT" ? "default" : "outline"} size="sm" asChild>
          <Link href="/app/invoices?status=draft">{t("status.draft")} ({totalDraft})</Link>
        </Button>
        <Button variant={currentStatus === "SENT" ? "default" : "outline"} size="sm" asChild>
          <Link href="/app/invoices?status=sent">{t("status.sent")} ({totalSent})</Link>
        </Button>
        <Button variant={currentStatus === "PAID" ? "default" : "outline"} size="sm" asChild>
          <Link href="/app/invoices?status=paid">{t("status.paid")} ({totalPaid})</Link>
        </Button>
        <Button variant={currentStatus === "CANCELLED" ? "default" : "outline"} size="sm" asChild>
          <Link href="/app/invoices?status=cancelled">{t("status.cancelled")} ({totalCancelled})</Link>
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <div className="text-sm text-muted-foreground">
              {total ? `${t("common.showing")} ${start}-${end} ${t("common.of")} ${total} ${t("common.invoices")}` : t("invoices.noInvoices")}
            </div>
          </div>
          
          {invoices.length > 0 ? (
            <div className="divide-y">
              {invoices.map((inv) => {
                const name = (inv.contact.company || `${inv.contact.firstName ?? ""} ${inv.contact.lastName ?? ""}`).trim();
                return (
                  <div key={inv.id} className="group relative transition-colors hover:bg-gray-50">
                    <Link
                      href={`/app/invoices/${inv.id}/preview`}
                      className="absolute inset-0"
                      aria-label={`${t("invoices.viewInvoiceFor")} ${name}`}
                    />
                    <div className="pointer-events-none relative px-6 py-4">
                      <div className="flex items-center justify-between w-full">
                        {/* Left side: Status Dropdown + Company Name */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="pointer-events-auto">
                            <InvoiceStatusDropdown
                              invoiceId={inv.id}
                              currentStatus={inv.status as "DRAFT" | "SENT" | "PAID" | "CANCELLED"}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate group-hover:underline">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {inv.number ? `#${inv.number}` : ""}
                              {inv.number && inv.issueDate ? " · " : ""}
                              {inv.issueDate
                                ? new Date(inv.issueDate).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
                                : ""}
                            </div>
                          </div>
                        </div>
                        {/* Amount and private PDF download (separate from row navigation). */}
                        <div className="ml-4 flex items-center gap-3">
                          <div className="text-right font-semibold text-lg">
                            {formatSwissNumber(Number(inv.totalGross))} {inv.currency}
                          </div>
                          <a
                            href={`/app/api/invoices/${inv.id}/pdf?format=PDF&download=1`}
                            download
                            title={t("preview.downloadPdf")}
                            aria-label={`${t("preview.downloadPdf")} #${inv.number ?? inv.id}`}
                            className="pointer-events-auto rounded-lg border border-gray-200 bg-white p-2 text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <FileText className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">{t("invoices.noInvoices")}</p>
                <p className="text-sm">{t("invoices.noInvoicesSub")}</p>
              </div>
            </div>
          )}
          
        </CardContent>
      </Card>
      
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 sm:gap-3" aria-label={t("common.pagination")}>
          <Button variant="outline" size="sm" asChild disabled={!prevPage}>
            <Link href={prevPage ? pageHref(prevPage) : "#"} aria-label={t("common.previous")}>
              <span aria-hidden="true">←</span>
              <span className="ml-1 hidden sm:inline">{t("common.previous")}</span>
            </Link>
          </Button>
          <div className="flex items-center gap-1.5">
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon-sm"
                  asChild
                >
                  <Link href={pageHref(p)} aria-current={p === page ? "page" : undefined}>
                    {p}
                  </Link>
                </Button>
              )
            )}
          </div>
          <Button variant="outline" size="sm" asChild disabled={!nextPage}>
            <Link href={nextPage ? pageHref(nextPage) : "#"} aria-label={t("common.next")}>
              <span className="mr-1 hidden sm:inline">{t("common.next")}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </Button>
        </nav>
      )}
    </div>
  );
}
