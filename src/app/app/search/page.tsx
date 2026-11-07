import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerT } from "@/lib/i18n-server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(user as { profileCompleted?: boolean }).profileCompleted) redirect("/onboarding");

  const sp = await searchParams;
  const q = (sp.q || "").trim();

  type CustomerRow = {
    id: string;
    company: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  type InvoiceRow = {
    id: string;
    reference: string | null;
    status: string;
    createdAt: Date;
    contact: { company: string | null; firstName: string | null; lastName: string | null };
  };

  let customers: CustomerRow[] = [];
  let invoices: InvoiceRow[] = [];

  if (q) {
    customers = await prisma.contact.findMany({
      where: {
        userId: user.id,
        OR: [
          { company: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    invoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
        OR: [
          { reference: { contains: q } },
          { message: { contains: q } },
          { contact: { company: { contains: q } } },
          { contact: { firstName: { contains: q } } },
          { contact: { lastName: { contains: q } } },
        ],
      },
      include: { contact: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
  }

  const total = customers.length + invoices.length;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("common.search")}</h1>
        <form method="GET" action="/search" className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={t("search.default")}
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t("common.search")}
          </button>
        </form>
      </div>

      {!q ? (
        <p className="text-sm text-gray-500">{t("search.default")}</p>
      ) : total === 0 ? (
        <p className="text-sm text-gray-500">
          {t("common.notFound")}: “{q}”
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {total} {t("common.found")} · “{q}”
          </p>

          {customers.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("nav.customers")} ({customers.length})
              </h2>
              <ul className="divide-y divide-gray-100 rounded-lg border">
                {customers.map((c) => {
                  const name =
                    c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/contacts/${c.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <span aria-hidden="true">👤</span>
                        <span className="font-medium text-gray-900">{name}</span>
                        {c.email && <span className="text-sm text-gray-400">{c.email}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {invoices.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("nav.invoices")} ({invoices.length})
              </h2>
              <ul className="divide-y divide-gray-100 rounded-lg border">
                {invoices.map((inv) => {
                  const name =
                    inv.contact.company ||
                    `${inv.contact.firstName ?? ""} ${inv.contact.lastName ?? ""}`.trim();
                  return (
                    <li key={inv.id}>
                      <Link
                        href={`/invoices/${inv.id}/preview`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <span aria-hidden="true">🧾</span>
                        <span className="font-medium text-gray-900">{name || "—"}</span>
                        {inv.reference && (
                          <span className="text-sm text-gray-500">· {inv.reference}</span>
                        )}
                        <span className="ml-auto text-sm text-gray-400">
                          {formatDate(inv.createdAt)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
