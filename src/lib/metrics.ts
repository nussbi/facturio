import { prisma } from "@/server/db";

function toNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "object" && typeof (v as any).toNumber === "function") return (v as any).toNumber();
  return Number(v) || 0;
}

function diffDays(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

export type CurrencySum = { CHF: number; EUR: number };

function emptyCur(): CurrencySum { return { CHF: 0, EUR: 0 }; }

function addCur(a: CurrencySum, ccy: "CHF" | "EUR", amt: number) {
  a[ccy] += amt;
}

type Metrics = Awaited<ReturnType<typeof computeDashboardMetrics>>;
// Per-user cache
const __cache = new Map<string, { at: number; data: Metrics }>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getDashboardMetrics(opts: { userId: string; force?: boolean }) {
  const { userId, force } = opts;
  const now = Date.now();
  const cached = __cache.get(userId);
  if (!force && cached && now - cached.at < TTL_MS) return cached.data;
  const data = await computeDashboardMetrics(userId);
  __cache.set(userId, { at: now, data });
  return data;
}

// Clear cache for a user (call after invoice/expense mutations)
export function invalidateMetricsCache(userId: string) {
  __cache.delete(userId);
}

async function computeDashboardMetrics(userId: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixMonthsAgo = new Date(now.getTime() - 183 * 86400000);
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 86400000);
  const ytd = startOfYear(now);

  // Try selecting outputSize, fallback if Prisma Client is stale
  async function fetchPaidRange(since: Date) {
    try {
      const rows = await prisma.invoice.findMany({
        where: { userId, status: "PAID", paidAt: { gte: since } },
        select: { paidAt: true, sentAt: true, issueDate: true, totalGross: true, currency: true, dueDate: true, contactId: true, outputSize: true as any },
      });
      return { rows, outputSupported: true };
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      if (msg.includes("Unknown field `outputSize`")) {
        const rows = await prisma.invoice.findMany({
          where: { userId, status: "PAID", paidAt: { gte: since } },
          select: { paidAt: true, sentAt: true, issueDate: true, totalGross: true, currency: true, dueDate: true, contactId: true },
        });
        return { rows, outputSupported: false };
      }
      throw e;
    }
  }

  const DEFAULT_TERMS_DAYS = 30;
  const [paid30Res, open, ytdInvoices, paid6mRes, paidYTD, allInvoicesTotal] = await Promise.all([
    fetchPaidRange(thirtyDaysAgo),
    prisma.invoice.findMany({
      // Treat all non-PAID/non-CANCELLED invoices as outstanding (includes DRAFT and SENT)
      where: { userId, status: { in: ["DRAFT", "SENT"] } },
      select: { id: true, currency: true, totalGross: true, dueDate: true, issueDate: true, createdAt: true, sentAt: true, contactId: true },
    }),
    prisma.invoice.findMany({
      where: { userId, issueDate: { gte: ytd } },
      select: { totalTax: true, currency: true },
    }),
    fetchPaidRange(sixMonthsAgo),
    prisma.invoice.findMany({
      where: { userId, status: 'PAID', paidAt: { gte: ytd } },
      select: { totalGross: true, currency: true },
    }),
    prisma.invoice.findMany({
      where: { userId, status: { not: 'CANCELLED' } },
      select: { totalGross: true, currency: true },
    }),
  ]);
  const paid30 = paid30Res.rows as any[];
  const paid6m = paid6mRes.rows as any[];
  const outputSupported = paid30Res.outputSupported && paid6mRes.outputSupported;

  // Overdue invoices (SENT, past due, unpaid) for the payment-reminders dashboard section
  const overdueInvoices = (
    await prisma.invoice.findMany({
      where: { userId, status: "SENT", paidAt: null, dueDate: { lt: now } },
      select: {
        id: true, number: true, totalGross: true, currency: true, dueDate: true, reminderCount: true,
        contact: { select: { company: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: "asc" },
    })
  ).map((i) => ({
    id: i.id,
    number: i.number,
    totalGross: toNumber(i.totalGross),
    currency: i.currency,
    dueDate: i.dueDate,
    reminderCount: i.reminderCount ?? 0,
    contactName: i.contact.company || `${i.contact.firstName ?? ""} ${i.contact.lastName ?? ""}`.trim() || "—",
  }));

  // Helper: derive due date when missing (fallback to issueDate/createdAt + 30 days)
  function derivedDue(i: any): Date | null {
    const base = i.dueDate ?? null;
    if (base) return base;
    const origin = i.issueDate ?? i.createdAt ?? null;
    if (!origin) return null;
    return new Date(new Date(origin).getTime() + DEFAULT_TERMS_DAYS * 86400000);
  }

  // DSO (avg days to pay over trailing 30 days, weighted by amount)
  let dsoDays = null as number | null;
  {
    const points = paid30
      .map((i) => {
        const start = i.sentAt ?? i.issueDate ?? i.paidAt!;
        const days = diffDays(i.paidAt!, start);
        const weight = toNumber(i.totalGross);
        return { days, weight };
      })
      .filter((p) => p.days >= 0 && p.weight > 0);
    if (points.length) {
      const wsum = points.reduce((s, p) => s + p.weight, 0);
      dsoDays = points.reduce((s, p) => s + p.days * p.weight, 0) / wsum;
      dsoDays = Math.round(dsoDays * 10) / 10;
    }
  }

  // OTPR (on-time payment rate trailing 30d)
  let otpr = null as number | null;
  {
    const valid = paid30.filter((i) => i.dueDate != null && i.paidAt != null);
    if (valid.length) {
      const onTime = valid.filter((i) => i.paidAt! <= i.dueDate!).length;
      otpr = Math.round((onTime / valid.length) * 1000) / 10; // percentage with 0.1 precision
    } else {
      otpr = null;
    }
  }

  // Outstanding by currency (open invoices)
  const outstanding: CurrencySum = emptyCur();
  for (const i of open) addCur(outstanding, i.currency as any, toNumber(i.totalGross));
  const outstandingCount = open.length;

  // Expected next 30 days using customer median delay (last 6 months)
  const expected30: CurrencySum = emptyCur();
  let expected30Count = 0;
  const delaysByContact = new Map<string, number>();
  {
    const byC: Record<string, number[]> = {};
    for (const i of paid6m) {
      const start = i.sentAt ?? i.issueDate ?? i.paidAt!;
      const d = diffDays(i.paidAt!, start);
      if (d >= 0) (byC[i.contactId] ||= []).push(d);
    }
    for (const [cid, arr] of Object.entries(byC)) {
      arr.sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      const med = arr.length % 2 ? arr[mid] : Math.round(((arr[mid - 1] + arr[mid]) / 2) * 10) / 10;
      delaysByContact.set(cid, med);
    }
    for (const inv of open) {
      const due = derivedDue(inv);
      if (!due) continue;
      const md = delaysByContact.get(inv.contactId) ?? 0;
      const expected = new Date(due.getTime() + md * 86400000);
      if (expected > now && expected <= thirtyDaysAhead) { addCur(expected30, inv.currency as any, toNumber(inv.totalGross)); expected30Count += 1; }
    }
  }

  // Revenue at risk (open invoices with >30 days past due)
  const risk: CurrencySum = emptyCur();
  let revenueAtRiskCount = 0;
  for (const i of open) {
    const due = derivedDue(i);
    if (due && diffDays(now, due) > 30) { addCur(risk, i.currency as any, toNumber(i.totalGross)); revenueAtRiskCount += 1; }
  }

  // VAT YTD (sum of totalTax by currency for invoices issued this year)
  const vatYTD: CurrencySum = emptyCur();
  for (const inv of ytdInvoices) addCur(vatYTD, inv.currency as any, toNumber(inv.totalTax));

  // Revenue YTD (sum of totalGross for PAID invoices paid since start of year)
  const revenueYTD: CurrencySum = emptyCur();
  for (const inv of paidYTD) addCur(revenueYTD, inv.currency as any, toNumber(inv.totalGross));
  const revenueYTDCount = paidYTD.length;

  // Total invoices value (all non-cancelled invoices)
  const totalInvoices: CurrencySum = emptyCur();
  for (const inv of allInvoicesTotal) addCur(totalInvoices, inv.currency as any, toNumber(inv.totalGross));

  // AR aging buckets for open invoices
  const agingBuckets = [
    { key: "CURRENT", label: "Current (not due)", match: (i: any) => { const d = derivedDue(i); return !d || d >= now; }, sum: emptyCur(), count: 0 },
    { key: "D1_30", label: "1–30 days past due", match: (i: any) => { const d = derivedDue(i); return d && diffDays(now, d) >= 1 && diffDays(now, d) <= 30; }, sum: emptyCur(), count: 0 },
    { key: "D31_60", label: "31–60 days past due", match: (i: any) => { const d = derivedDue(i); return d && diffDays(now, d) >= 31 && diffDays(now, d) <= 60; }, sum: emptyCur(), count: 0 },
    { key: "D61_90", label: "61–90 days past due", match: (i: any) => { const d = derivedDue(i); return d && diffDays(now, d) >= 61 && diffDays(now, d) <= 90; }, sum: emptyCur(), count: 0 },
    { key: "D90P", label: "> 90 days past due", match: (i: any) => { const d = derivedDue(i); return d && diffDays(now, d) > 90; }, sum: emptyCur(), count: 0 },
  ];
  for (const inv of open) {
    const bucket = agingBuckets.find((b) => b.match(inv));
    if (!bucket) continue;
    bucket.count += 1;
    addCur(bucket.sum, inv.currency as any, toNumber(inv.totalGross));
  }

  // Slow-payer leaderboard (top 5 by open 60+ dpd, show WADP 90d if available)
  const open60ByContact = new Map<string, CurrencySum>();
  for (const i of open) {
    const dpd = i.dueDate ? diffDays(now, i.dueDate) : 0;
    if (dpd >= 60) {
      const cur = open60ByContact.get(i.contactId) || emptyCur();
      addCur(cur, i.currency as any, toNumber(i.totalGross));
      open60ByContact.set(i.contactId, cur);
    }
  }
  const wadpByContact = new Map<string, number>();
  const grouped: Record<string, { num: number; den: number }> = {};
  for (const i of paid30) {
    const start = i.sentAt ?? i.issueDate ?? i.paidAt!;
    const days = diffDays(i.paidAt!, start);
    const w = toNumber(i.totalGross);
    if (days >= 0 && w > 0) {
      const g = (grouped[i.contactId] ||= { num: 0, den: 0 });
      g.num += days * w;
      g.den += w;
    }
  }
  for (const [cid, g] of Object.entries(grouped)) wadpByContact.set(cid, g.den ? Math.round((g.num / g.den) * 10) / 10 : 0);

  const contactIds = Array.from(open60ByContact.keys());
  const contacts = contactIds.length
    ? await prisma.contact.findMany({ where: { userId, id: { in: contactIds } }, select: { id: true, company: true, firstName: true, lastName: true } })
    : [];
  const contactName = (c: { company: string | null; firstName: string | null; lastName: string | null }) =>
    c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unknown";

  const slowPayers = contactIds
    .map((id) => {
      const sums = open60ByContact.get(id)!;
      const wadp = wadpByContact.get(id) ?? null;
      const c = contacts.find((x) => x.id === id);
      return { contactId: id, name: c ? contactName(c) : id, open60: sums, wadp };
    })
    .sort((a, b) => (b.open60.CHF + b.open60.EUR) - (a.open60.CHF + a.open60.EUR))
    .slice(0, 5);

  // Format impact (median days to pay and on-time rate by outputSize)
  const byFormat: Record<string, { count: number; medianDays: number | null; onTimeRate: number | null }> = {};
  if (outputSupported) {
    const groups: Record<string, number[]> = {};
    const onTimeCnt: Record<string, { on: number; tot: number }> = {};
    for (const i of paid6m) {
      const fmt = (i as any).outputSize as string | null ?? 'UNKNOWN';
      const start = (i as any).sentAt ?? (i as any).issueDate ?? (i as any).paidAt!;
      const d = diffDays((i as any).paidAt!, start);
      if (d >= 0) (groups[fmt] ||= []).push(d);
      if ((i as any).dueDate) {
        const wasOnTime = (i as any).paidAt! <= (i as any).dueDate;
        const s = (onTimeCnt[fmt] ||= { on: 0, tot: 0 });
        s.tot += 1; if (wasOnTime) s.on += 1;
      }
    }
    for (const [fmt, arr] of Object.entries(groups)) {
      arr.sort((a, b) => a - b);
      const mid = Math.floor(arr.length / 2);
      const med = arr.length ? (arr.length % 2 ? arr[mid] : Math.round(((arr[mid - 1] + arr[mid]) / 2) * 10) / 10) : null;
      const ot = onTimeCnt[fmt];
      const rate = ot ? Math.round((ot.on / Math.max(ot.tot, 1)) * 1000) / 10 : null;
      byFormat[fmt] = { count: arr.length, medianDays: med, onTimeRate: rate };
    }
  }

  // Payment terms mix and medians
  const allInv = await prisma.invoice.findMany({ where: { userId }, select: { issueDate: true, dueDate: true, status: true, paidAt: true, totalGross: true } });
  type TermsKey = 'D10'|'D15'|'D30'|'D90'|'SPECIFIC'|'UNSPECIFIED';
  const termsMix: Record<TermsKey, { count: number; amount: number }> = {
    D10: { count: 0, amount: 0 }, D15: { count: 0, amount: 0 }, D30: { count: 0, amount: 0 }, D90: { count: 0, amount: 0 }, SPECIFIC: { count: 0, amount: 0 }, UNSPECIFIED: { count: 0, amount: 0 },
  };
  function bucketFor(inv: { issueDate: Date; dueDate: Date | null }): TermsKey {
    if (!inv.dueDate) return 'UNSPECIFIED';
    const d = diffDays(inv.dueDate, inv.issueDate);
    if (d === 10) return 'D10';
    if (d === 15) return 'D15';
    if (d === 30) return 'D30';
    if (d === 90) return 'D90';
    return 'SPECIFIC';
  }
  for (const inv of allInv) {
    const b = bucketFor(inv as any);
    termsMix[b].count += 1;
    termsMix[b].amount += toNumber((inv as any).totalGross);
  }
  // Median days to pay per terms (from paid6m) and on-time rate by terms
  const medByTerms: Partial<Record<TermsKey, number | null>> = {};
  const mapDays: Record<TermsKey, number[]> = { D10: [], D15: [], D30: [], D90: [], SPECIFIC: [], UNSPECIFIED: [] };
  const onTimeTerms: Record<TermsKey, { on: number; tot: number }> = { D10:{on:0,tot:0}, D15:{on:0,tot:0}, D30:{on:0,tot:0}, D90:{on:0,tot:0}, SPECIFIC:{on:0,tot:0}, UNSPECIFIED:{on:0,tot:0} };
  for (const i of paid6m) {
    const key = bucketFor(i as any);
    if (i.paidAt) {
      const start = i.sentAt ?? i.issueDate ?? i.paidAt;
      const d = diffDays(i.paidAt, start!);
      if (d >= 0) mapDays[key].push(d);
    }
    if ((i as any).dueDate && (i as any).paidAt) {
      const wasOnTime = (i as any).paidAt <= (i as any).dueDate;
      onTimeTerms[key].tot += 1; if (wasOnTime) onTimeTerms[key].on += 1;
    }
  }
  for (const [k, arr] of Object.entries(mapDays)) {
    arr.sort((a,b)=>a-b);
    const mid = Math.floor(arr.length / 2);
    medByTerms[k as TermsKey] = arr.length ? (arr.length % 2 ? arr[mid] : Math.round(((arr[mid-1] + arr[mid]) / 2) * 10) / 10) : null;
  }
  const termsImpact = Object.fromEntries((Object.keys(termsMix) as TermsKey[]).map(k => {
    const it = termsMix[k];
    const rate = onTimeTerms[k].tot ? Math.round((onTimeTerms[k].on / onTimeTerms[k].tot) * 1000) / 10 : null;
    return [k, { count: it.count, medianDays: medByTerms[k] ?? null, onTimeRate: rate }];
  }));

  // Unpaid share (all invoices)
  const totalInv = allInv.length || 1;
  const unpaidCount = allInv.filter((i:any)=> i.status === 'SENT').length;
  const unpaidShare = Math.round((unpaidCount / totalInv) * 1000) / 10;
  // Unpaid trend (last 6 months %)
  const unpaidTrend: number[] = [];
  const unpaidTrendLabels: string[] = [];
  for (let i=5;i>=0;i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const monthInv = allInv.filter(x=> new Date(x.issueDate).getFullYear()===d.getFullYear() && new Date(x.issueDate).getMonth()===d.getMonth());
    const tot = monthInv.length || 1;
    const unp = monthInv.filter((x:any)=>x.status==='SENT').length;
    unpaidTrend.push(Math.round((unp / tot) * 1000)/10);
    unpaidTrendLabels.push(d.toLocaleString('de-CH', { month: 'short', year: '2-digit' }));
  }

  return {
    kpis: {
      dsoDays,
      otpr, // percent 0-100
      outstanding,
      expected30: expected30,
      revenueAtRisk: risk,
      vatYTD,
      revenueYTD,
      totalInvoices,
      unpaidShare,
      outstandingCount,
      expected30Count,
      revenueAtRiskCount,
      revenueYTDCount,
      totalInvoicesCount: allInvoicesTotal.length,
    },
    overdueInvoices,
    aging: agingBuckets.map((b) => ({ key: b.key, label: b.label, count: b.count, sum: b.sum })),
    currencyExposure: outstanding,
    formatImpact: { available: outputSupported, byFormat },
    terms: { mix: termsMix, medians: medByTerms },
    termsImpact,
    unpaidShare,
    unpaidTrend,
    unpaidTrendLabels,
    slowPayers,
  };
}

