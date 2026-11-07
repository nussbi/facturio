"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { AlertCircle, TrendingUp, Calendar, Clock, CheckCircle2, AlertTriangle, Plus, UserPlus, ArrowUpRight } from "lucide-react";
import { formatSwissNumber } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";

type Cur = { CHF: number; EUR: number };
type Kpis = {
  outstanding?: Cur;
  expected30?: Cur;
  revenueYTD?: Cur;
  revenueAtRisk?: Cur;
  outstandingCount?: number;
  expected30Count?: number;
  revenueYTDCount?: number;
  revenueAtRiskCount?: number;
  totalInvoicesCount?: number;
};
type SlowPayer = { contactId: string; name: string; open60: Cur; wadp: number | null };
type OverdueInvoice = { id: string; number: number | null; totalGross: number; currency: string; dueDate: string | null; reminderCount: number; contactName: string };

const T = {
  en: {
    dashboard: "Dashboard",
    greeting: "Welcome back",
    waitingOn: "Waiting on",
    open: "open — sent or draft",
    invoices: (n: number) => `${n} invoice${n === 1 ? "" : "s"}`,
    coming30: "Coming in 30 days",
    expected30: "expected in the next 30 days",
    invoicedYtd: "Invoiced this year",
    paidYtd: "paid invoices this year",
    overdue: "Overdue",
    overdueSub: "more than 30 days late",
    paymentHealth: "Payment health",
    dso: "Avg. days to pay",
    dsoSub: "weighted, last 90 days",
    otpr: "On-time payment rate",
    otprSub: "paid by due date, last 90 days",
    unpaid: "Unpaid share",
    unpaidSub: "share of all invoices",
    leaderboard: "Payment delays",
    leaderboardSub: "Customers with overdue invoices and payment delays",
    customer: "Customer",
    open60: "Open 60+",
    open60eur: "Open 60+ (EUR)",
    wadp: "WADP 30d",
    noData: "N/A",
    days: "days",
    noSlow: "No slow payers found. Great job! 🎉",
    newInvoice: "New invoice",
    newCustomer: "New customer",
    remindersTitle: "Payment reminders",
    remindersSub: "Overdue invoices awaiting payment",
    remind: "Remind",
    remindersSent: "reminders sent",
    remindersPro: "Automated payment reminders are a Professional feature",
    noOverdue: "No overdue invoices. Great job! 🎉",
    upgrade: "Upgrade",
    viewAll: "View all",
    cashflow: "Cash flow",
    cashflowSub: "Where your money is, at a glance",
  },
  de: {
    dashboard: "Übersicht",
    greeting: "Willkommen zurück",
    waitingOn: "Ausstehend",
    open: "offen – gesendet oder Entwurf",
    invoices: (n: number) => `${n} Rechnung${n === 1 ? "" : "en"}`,
    coming30: "In 30 Tagen erwartet",
    expected30: "in den nächsten 30 Tagen erwartet",
    invoicedYtd: "Dieses Jahr verrechnet",
    paidYtd: "bezahlte Rechnungen dieses Jahr",
    overdue: "Überfällig",
    overdueSub: "mehr als 30 Tage überfällig",
    paymentHealth: "Zahlungsverhalten",
    dso: "Ø Zahlungsfrist",
    dsoSub: "gewichtet, letzte 90 Tage",
    otpr: "Pünktliche Zahlungen",
    otprSub: "bis Fälligkeit bezahlt, 90 Tage",
    unpaid: "Offener Anteil",
    unpaidSub: "Anteil aller Rechnungen",
    leaderboard: "Zahlungsverzug nach Kunde",
    leaderboardSub: "Offene Rechnungen über 60 Tage und Zahlungsverzögerungen",
    customer: "Kunde",
    open60: "Offen 60+",
    open60eur: "Offen 60+ (EUR)",
    wadp: "WADP 30T",
    noData: "N/A",
    days: "Tage",
    noSlow: "Kein Zahlungsverzug. Gut gemacht! 🎉",
    newInvoice: "Neue Rechnung",
    newCustomer: "Neuer Kunde",
    remindersTitle: "Zahlungserinnerungen",
    remindersSub: "Überfällige Rechnungen, die auf Zahlung warten",
    remind: "Erinnern",
    remindersSent: "Erinnerungen gesendet",
    remindersPro: "Automatische Zahlungserinnerungen sind ein Professional-Feature",
    noOverdue: "Keine überfälligen Rechnungen. Gut gemacht! 🎉",
    upgrade: "Upgraden",
    viewAll: "Alle anzeigen",
    cashflow: "Geldfluss",
    cashflowSub: "Wo dein Geld ist, auf einen Blick",
  },
  fr: {
    dashboard: "Tableau de bord",
    greeting: "Bon retour",
    waitingOn: "En attente",
    open: "ouvertes – envoyées ou brouillons",
    invoices: (n: number) => `${n} facture${n === 1 ? "" : "s"}`,
    coming30: "Attendues dans 30 jours",
    expected30: "attendues dans les 30 prochains jours",
    invoicedYtd: "Facturé cette année",
    paidYtd: "factures payées cette année",
    overdue: "En retard",
    overdueSub: "en retard de plus de 30 jours",
    paymentHealth: "Santé des paiements",
    dso: "Délai moyen de paiement",
    dsoSub: "pondéré, 90 derniers jours",
    otpr: "Paiements à temps",
    otprSub: "payées à échéance, 90 jours",
    unpaid: "Part impayée",
    unpaidSub: "part de toutes les factures",
    leaderboard: "Clients qui paient en retard",
    leaderboardSub: "Factures en retard et délais de paiement",
    customer: "Client",
    open60: "Ouvert 60+",
    open60eur: "Ouvert 60+ (EUR)",
    wadp: "WADP 30j",
    noData: "N/A",
    days: "jours",
    noSlow: "Aucun retard de paiement. Bien joué ! 🎉",
    newInvoice: "Nouvelle facture",
    newCustomer: "Nouveau client",
    remindersTitle: "Rappels de paiement",
    remindersSub: "Factures en retard en attente de paiement",
    remind: "Rappeler",
    remindersSent: "rappels envoyés",
    remindersPro: "Les rappels automatiques sont une fonctionnalité Professional",
    noOverdue: "Aucune facture en retard. Bien joué ! 🎉",
    upgrade: "Mettre à niveau",
    viewAll: "Tout voir",
    cashflow: "Flux de trésorerie",
    cashflowSub: "Où se trouve votre argent, en un coup d'œil",
  },
  it: {
    dashboard: "Cruscotto",
    greeting: "Bentornato",
    waitingOn: "In attesa",
    open: "aperte – inviate o bozze",
    invoices: (n: number) => `${n} fattura${n === 1 ? "" : "e"}`,
    coming30: "In arrivo entro 30 giorni",
    expected30: "attese nei prossimi 30 giorni",
    invoicedYtd: "Fatturato quest'anno",
    paidYtd: "fatture pagate quest'anno",
    overdue: "In ritardo",
    overdueSub: "in ritardo di oltre 30 giorni",
    paymentHealth: "Salute dei pagamenti",
    dso: "Giorni medi di pagamento",
    dsoSub: "ponderati, ultimi 90 giorni",
    otpr: "Pagamenti puntuali",
    otprSub: "pagati entro scadenza, 90 giorni",
    unpaid: "Quota non pagata",
    unpaidSub: "quota di tutte le fatture",
    leaderboard: "Ritardi di pagamento",
    leaderboardSub: "Clienti con fatture scadute e ritardi di pagamento",
    customer: "Cliente",
    open60: "Aperte 60+",
    open60eur: "Aperte 60+ (EUR)",
    wadp: "WADP 30gg",
    noData: "N/D",
    days: "giorni",
    noSlow: "Nessun ritardo di pagamento. Ottimo lavoro! 🎉",
    newInvoice: "Nuova fattura",
    newCustomer: "Nuovo cliente",
    remindersTitle: "Promemoria di pagamento",
    remindersSub: "Fatture in ritardo in attesa di pagamento",
    remind: "Ricorda",
    remindersSent: "promemoria inviati",
    remindersPro: "I promemoria automatici sono una funzione Professional",
    noOverdue: "Nessuna fattura in ritardo. Ottimo lavoro! 🎉",
    upgrade: "Aggiorna",
    viewAll: "Vedi tutti",
    cashflow: "Flusso di cassa",
    cashflowSub: "Dove sono i tuoi soldi, a colpo d'occhio",
  },
} as const;

export default function DashboardClient({
  kpis,
  slowPayers,
  userName,
  dsoDays,
  otpr,
  unpaidShare,
  overdueInvoices,
  isPro,
}: {
  kpis: Kpis;
  slowPayers: SlowPayer[];
  userName?: string;
  dsoDays?: number | null;
  otpr?: number | null;
  unpaidShare?: number | null;
  overdueInvoices?: OverdueInvoice[];
  isPro?: boolean;
}) {
  const { lang } = useLanguage();

  const t = T[lang];
  const fmt = (c?: Cur) => (c && c.CHF > 0 ? `${formatSwissNumber(c.CHF)} CHF` : null);

  const [reminding, setReminding] = useState<string | null>(null);
  const [remindError, setRemindError] = useState("");

  async function remind(invoiceId: string) {
    setReminding(invoiceId);
    setRemindError("");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/remind`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      window.location.reload();
    } catch (e: any) {
      setRemindError(e?.message || "Failed to send reminder");
      setReminding(null);
    }
  }

  const today = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const cards = [
    { label: t.waitingOn, sub: t.open, count: kpis.outstandingCount ?? 0, amount: fmt(kpis.outstanding), href: "/invoices", iconBg: "bg-blue-600", Icon: TrendingUp },
    { label: t.coming30, sub: t.expected30, count: kpis.expected30Count ?? 0, amount: fmt(kpis.expected30), href: "/invoices?status=sent", iconBg: "bg-emerald-600", Icon: Calendar },
    { label: t.invoicedYtd, sub: t.paidYtd, count: kpis.revenueYTDCount ?? 0, amount: fmt(kpis.revenueYTD), href: "/invoices?status=paid", iconBg: "bg-violet-600", Icon: TrendingUp },
    { label: t.overdue, sub: t.overdueSub, count: kpis.revenueAtRiskCount ?? 0, amount: fmt(kpis.revenueAtRisk), href: "/invoices?status=sent", iconBg: "bg-rose-600", Icon: AlertCircle },
  ];

  const health = [
    {
      label: t.dso,
      value: dsoDays != null ? `${formatSwissNumber(dsoDays, { maximumFractionDigits: 1 })}` : null,
      unit: t.days,
      sub: t.dsoSub,
      tone: dsoDays != null && dsoDays > 30 ? "text-rose-600" : "text-emerald-600",
      Icon: Clock,
      pct: null as number | null,
    },
    {
      label: t.otpr,
      value: otpr != null ? `${formatSwissNumber(otpr, { maximumFractionDigits: 1 })}%` : null,
      unit: "",
      sub: t.otprSub,
      tone: otpr != null && otpr < 80 ? "text-amber-600" : "text-emerald-600",
      Icon: CheckCircle2,
      pct: otpr != null ? Math.max(0, Math.min(100, otpr)) : null,
    },
    {
      label: t.unpaid,
      value: unpaidShare != null ? `${formatSwissNumber(unpaidShare, { maximumFractionDigits: 1 })}%` : null,
      unit: "",
      sub: t.unpaidSub,
      tone: unpaidShare != null && unpaidShare > 40 ? "text-rose-600" : "text-emerald-600",
      Icon: AlertTriangle,
      pct: unpaidShare != null ? Math.max(0, Math.min(100, unpaidShare)) : null,
    },
  ];

  const o = kpis.outstanding?.CHF ?? 0;
  const e = kpis.expected30?.CHF ?? 0;
  const y = kpis.revenueYTD?.CHF ?? 0;
  const total = o + e + y;
  const seg = {
    outstanding: total > 0 ? Math.round((o / total) * 100) : 0,
    expected: total > 0 ? Math.round((e / total) * 100) : 0,
    paid: total > 0 ? Math.round((y / total) * 100) : 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground capitalize">{today}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {userName ? `${t.greeting}, ${userName}` : t.dashboard}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contacts/new" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
            <UserPlus className="h-4 w-4" />
            {t.newCustomer}
          </Link>
          <Link href="/invoices/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-105">
            <Plus className="h-4 w-4" />
            {t.newInvoice}
          </Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group">
            <Card className="h-full border-0 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} text-white shadow-sm`}>
                    <c.Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</div>
                <div className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">{c.amount ?? "—"}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.invoices(c.count)} · {c.sub}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Cash-flow snapshot */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-muted-foreground">{t.cashflow}</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">{t.cashflowSub}</p>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="bg-blue-600" style={{ width: `${seg.outstanding}%` }} />
              <div className="bg-emerald-600" style={{ width: `${seg.expected}%` }} />
              <div className="bg-violet-600" style={{ width: `${seg.paid}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-3">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" /><span className="text-muted-foreground">{t.waitingOn}</span></div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600" /><span className="text-muted-foreground">{t.coming30}</span></div>
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-600" /><span className="text-muted-foreground">{t.invoicedYtd}</span></div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Payment health */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-muted-foreground">{t.paymentHealth}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {health.map((h) => (
            <Card key={h.label} className="border-0 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${h.tone} bg-muted/70`}>
                    <h.Icon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{h.label}</span>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <p className={`text-2xl font-bold ${h.tone}`}>{h.value ?? "—"}</p>
                  {h.unit ? <span className="text-sm text-muted-foreground">{h.unit}</span> : null}
                </div>
                {h.pct != null ? (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${h.tone.replace("text-", "bg-")}`} style={{ width: `${h.pct}%` }} />
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">{h.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Reminders */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.remindersTitle}</CardTitle>
          <CardDescription>{t.remindersSub}</CardDescription>
        </CardHeader>
        <CardContent>
          {isPro ? (
            overdueInvoices && overdueInvoices.length ? (
              <>
                <ul className="divide-y divide-border">
                {overdueInvoices.slice(0, 5).map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {inv.contactName}
                        {inv.number != null ? <span className="text-muted-foreground"> · #{inv.number}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatSwissNumber(inv.totalGross)} {inv.currency}
                        {inv.dueDate ? ` · ${new Date(inv.dueDate).toISOString().slice(0, 10)}` : ""}
                        {inv.reminderCount > 0 ? ` · ${inv.reminderCount} ${t.remindersSent}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => remind(inv.id)}
                      disabled={reminding === inv.id}
                      className="shrink-0 rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {reminding === inv.id ? "…" : t.remind}
                    </button>
                  </li>
                ))}
              </ul>
              {overdueInvoices.length > 5 ? (
                <Link href="/invoices?status=SENT" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
                  {t.viewAll}
                </Link>
              ) : null}
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">{t.noOverdue}</div>
            )
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <p>{t.remindersPro}</p>
              <Link href="/settings" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
                {t.upgrade}
              </Link>
            </div>
          )}
          {remindError && <div className="mt-2 text-xs text-red-600">{remindError}</div>}
        </CardContent>
      </Card>

      {/* Slow-payer leaderboard */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t.leaderboard}</CardTitle>
          <CardDescription>{t.leaderboardSub}</CardDescription>
        </CardHeader>
        <CardContent>
          {slowPayers.length ? (
            <div>
              <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="text-center">#</span>
                <span>{t.customer}</span>
                <span className="text-right">{t.wadp}</span>
              </div>
              <ul className="pt-1">
                {slowPayers.map((row, idx) => {
                  const rank = idx + 1;
                  const medal =
                    rank === 1
                      ? "bg-amber-400 text-amber-950"
                      : rank === 2
                      ? "bg-slate-300 text-slate-800"
                      : rank === 3
                      ? "bg-orange-300 text-orange-950"
                      : "bg-muted text-muted-foreground";
                  const wadpTone =
                    row.wadp == null
                      ? "text-muted-foreground"
                      : row.wadp > 45
                      ? "text-destructive"
                      : row.wadp > 30
                      ? "text-amber-600"
                      : "text-emerald-600";
                  const barTone =
                    row.wadp == null
                      ? ""
                      : row.wadp > 45
                      ? "bg-destructive"
                      : row.wadp > 30
                      ? "bg-amber-500"
                      : "bg-emerald-500";
                  return (
                    <li key={row.contactId}>
                      <Link href={`/contacts/${row.contactId}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${medal}`}>
                          {rank}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{row.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground/80">
                              {formatSwissNumber(row.open60.CHF)} CHF
                            </span>
                            {row.open60.EUR ? <span>· {formatSwissNumber(row.open60.EUR)} EUR</span> : null}
                            <span>· {t.open60}</span>
                          </div>
                          {row.wadp != null && (
                            <div className="mt-1.5 h-1 w-full max-w-[15rem] overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${barTone}`}
                                style={{ width: `${Math.min(100, Math.max(4, (row.wadp / 60) * 100))}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {row.wadp == null ? (
                            <span className="text-xs text-muted-foreground">{t.noData}</span>
                          ) : (
                            <div className="flex flex-col items-end leading-tight">
                              <span className={`text-base font-bold ${wadpTone}`}>
                                {formatSwissNumber(row.wadp, { maximumFractionDigits: 1 })}
                              </span>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.days}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">{t.noSlow}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
