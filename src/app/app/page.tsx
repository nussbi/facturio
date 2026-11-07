import { getDashboardMetrics } from "@/lib/metrics";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

// Force dynamic rendering for proper middleware routing
export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Force refresh to avoid stale in-memory cache for user KPIs
  const data = await getDashboardMetrics({ userId: user.id, force: true });

  return (
    <DashboardClient
      userName={user.name ?? undefined}
      dsoDays={data.kpis.dsoDays}
      otpr={data.kpis.otpr}
      unpaidShare={data.kpis.unpaidShare}
      kpis={{
        outstanding: data.kpis.outstanding,
        expected30: data.kpis.expected30,
        revenueYTD: data.kpis.revenueYTD,
        revenueAtRisk: data.kpis.revenueAtRisk,
        outstandingCount: data.kpis.outstandingCount,
        expected30Count: data.kpis.expected30Count,
        revenueYTDCount: data.kpis.revenueYTDCount,
        revenueAtRiskCount: data.kpis.revenueAtRiskCount,
        totalInvoicesCount: data.kpis.totalInvoicesCount,
      }}
      slowPayers={data.slowPayers as any}
      overdueInvoices={(data as any).overdueInvoices as any}
      isPro={(user as any).plan === "PRO"}
    />
  );
}
