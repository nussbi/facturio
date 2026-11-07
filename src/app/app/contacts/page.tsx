import { prisma } from "@/server/db";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerT } from "@/lib/i18n-server";

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

type ContactLike = {
  id: string;
  company?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function displayName(c: ContactLike) {
  return (c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()) || "";
}

function initialsFor(c: ContactLike) {
  const name = displayName(c);
  const parts = name.split(/\s+/).filter(Boolean);
  const ini = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0]?.slice(0, 2) || "?");
  return ini.toUpperCase();
}

function colorFor(c: ContactLike) {
  const seed = c.company || c.firstName || c.lastName || c.id || "";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function ContactsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(user as { profileCompleted?: boolean }).profileCompleted) redirect('/onboarding');
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const take = 10;
  const where = q
    ? {
        userId: user.id,
        OR: [
          { company: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : { userId: user.id };
  const total = await prisma.contact.count({ where });
  const contacts = await prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take });
  const start = total === 0 ? 0 : (page - 1) * take + 1;
  const end = Math.min(page * take, total);
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page * take < total ? page + 1 : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("contacts.title")}</h1>
        <Button asChild variant="default" size="lg" className="bg-sidebar-accent shadow-sm hover:bg-sidebar-accent/80 brand-gradient font-medium h-11 px-6 text-base">
          <Link href="/contacts/new">
            {t("contacts.addCustomer")}
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b">
            <div className="text-sm text-muted-foreground">
              {total ? `${t("common.showing")} ${start}-${end} ${t("common.of")} ${total} ${t("common.customers")}` : t("contacts.noCustomers")}
            </div>
          </div>

          {contacts.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contacts/${c.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <span
                      className={`h-10 w-10 rounded-full ${colorFor(c as typeof c & { id: string })} text-white flex items-center justify-center text-sm font-semibold shrink-0`}
                      aria-hidden="true"
                    >
                      {initialsFor(c as typeof c & { id: string })}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium text-gray-900 truncate">
                        {displayName(c as typeof c & { id: string })}
                      </span>
                      <span className="block text-sm text-muted-foreground truncate">
                        {[c.email, [c.street, c.zipCode, c.place].filter(Boolean).join(", ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <svg
                      className="h-5 w-5 text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-900">{t("contacts.noCustomers")}</p>
                <p className="text-sm">{t("contacts.noCustomersSub")}</p>
              </div>
            </div>
          )}
          {total > take && (
            <div className="flex items-center justify-between mt-6 px-6 pb-4">
              <Button variant="outline" size="sm" asChild disabled={!prevPage}>
                <Link href={prevPage ? `/contacts?page=${prevPage}${q ? `&q=${encodeURIComponent(q)}` : ""}` : "#"}>
                  ← {t("common.previous")}
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">{t("common.page")} {page}</span>
              <Button variant="outline" size="sm" asChild disabled={!nextPage}>
                <Link href={nextPage ? `/contacts?page=${nextPage}${q ? `&q=${encodeURIComponent(q)}` : ""}` : "#"}>
                  {t("common.next")} →
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
