import { prisma } from "@/server/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { formatSwissNumber, formatDate } from "@/lib/utils";
import { getServerT } from "@/lib/i18n-server";

export default async function ExpensesPage() {
  const t = await getServerT();
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!(user as any).profileCompleted) redirect('/onboarding');
  const expenses = await prisma.expense.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { contact: true } });
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("expenses.title")}</h1>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t("expenses.title")}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {expenses.length ? t("expenses.foundCount").replace("{count}", String(expenses.length)) : t("expenses.noExpenses")}
              </CardDescription>
            </div>
            <Button asChild variant="default" size="sm" className="bg-sidebar-accent hover:bg-sidebar-accent/80 brand-gradient font-medium">
              <Link href="/expenses/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("expenses.addExpense")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          
          {expenses.length > 0 ? (
            <div className="divide-y">
              {expenses.map((expense) => {
                const total = Number(expense.quantity) * Number(expense.unitPrice);
                return (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium text-gray-900 truncate">
                              {expense.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{Number(expense.quantity)} × {expense.unit}</span>
                            <span>•</span>
                            <span>{formatSwissNumber(Number(expense.unitPrice))} {expense.currency}/{expense.unit}</span>
                            <span>•</span>
                            <span>{formatDate(expense.date)}</span>
                            {expense.contact && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-gray-700">
                                  {expense.contact.company || `${expense.contact.firstName ?? ""} ${expense.contact.lastName ?? ""}`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-lg">
                            {formatSwissNumber(total)} {expense.currency}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Receipt className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">{t("expenses.noExpensesTracked")}</p>
                <p className="text-sm">{t("expenses.noExpensesSub")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
